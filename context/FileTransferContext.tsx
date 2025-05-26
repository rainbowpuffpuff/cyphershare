// /context/FileTransferContext.tsx
// Orchestrates file transfer workflow using WakuContext, CodexContext, and TacoContext
// Handles file management state, encrypting/decrypting, and coordinating operations between contexts

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from "react";
import { toast } from "sonner";
import { useTacoContext } from "./TacoContext";
import { useCodexContext } from "./CodexContext";
import { useWakuContext } from "./WakuContext";
import { WakuFileMessage } from "@/hooks/useWaku";
import { useFileList } from "@/hooks/useFileList";
import { useFileEncryption } from "@/hooks/useFileEncryption";
import { prepareFileMetadata, copyToClipboard, downloadFileFromBlob } from "@/utils/fileUtils";
import { FileItem } from "@/types/files";

//-----------------------------------------------------------------------------
// Types 
//-----------------------------------------------------------------------------

interface FileTransferContextType {
  // State
  sentFiles: FileItem[];
  receivedFiles: FileItem[];
  uploadingFiles: Record<
    string,
    {
      progress: number;
      name: string;
      size: number;
      type: string;
      timestamp?: string;
      isEncrypted?: boolean;
      accessCondition?: string;
    }
  >;
  uploadError: string | null;
  copySuccess: string | null;
  // Actions
  sendFiles: (files: File[]) => Promise<void>;
  copyFileCid: (fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
  // Forwarded status from other contexts
  isTacoInit: boolean;
  wakuPeerCount: number;
  isWakuConnected: boolean;
  isWakuConnecting: boolean;
}

const FileTransferContext = createContext<FileTransferContextType | null>(null);
export const useFileTransfer = () => {
  const ctx = useContext(FileTransferContext);
  if (!ctx) throw new Error("useFileTransfer must be used within <FileTransferProvider>");
  return ctx;
};

//-----------------------------------------------------------------------------
// Provider implementation
//-----------------------------------------------------------------------------
// Public interface for FileTransfer handle that can be passed to WakuProvider
export interface FileTransferHandle {
  handleFileReceived: (fileMessage: WakuFileMessage) => void;
}

interface Props {
  children: ReactNode;
}

export const FileTransferProvider = forwardRef<FileTransferHandle, Props>(({ children }, ref) => {

  // Get TACo functionality from the TacoContext
  const {
    isTacoInit,
    encryptDataToBytes,
    decryptDataFromBytes,
    useEncryption,
    accessConditionType,
    windowTimeSeconds,
  } = useTacoContext();

  // Get Codex functionality from CodexContext
  const {
    isCodexNodeActive,
    uploadFile: codexUploadFile,
    downloadFile: codexDownloadFile,
  } = useCodexContext();

  // Get Waku functionality from WakuContext
  const {
    isWakuConnected,
    isWakuConnecting,
    wakuPeerCount,
    sendFileMessage,
  } = useWakuContext();

  const { 
    encryptFile, 
    decryptBlob, 
    checkEncryptionRequirements, 
    error: encryptionError, 
    setError: setEncryptionError 
  } = useFileEncryption();
  // State for file management
  const { sentFiles, receivedFiles, addSentFile, addReceivedFile, findFileById } = useFileList();
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, any>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  //-----------------------------------------------------------------------------
  // Expose handleFileReceived to the WakuProvider via ref
  //-----------------------------------------------------------------------------
  const handleFileReceived = useCallback(
  (fileMessage: WakuFileMessage) => {
    const ourSenderId = sessionStorage.getItem("wakuSenderId");
    const isSentByUs = ourSenderId && fileMessage.sender === ourSenderId;
    if (isSentByUs) {
      return; // ignore our own
    }

    // Create file item and add to received list
    const newItem: FileItem = {
      id: Date.now(),
      name: fileMessage.fileName,
      size: fileMessage.fileSize,
      type: fileMessage.fileType,
      timestamp: new Date(fileMessage.timestamp).toLocaleTimeString(),
      fileId: fileMessage.fileId,
      isEncrypted: fileMessage.isEncrypted,
      accessCondition: fileMessage.accessCondition,
    };
    
    addReceivedFile(newItem);
  },
  [addReceivedFile]
);
  
  // Expose the handleFileReceived function to parent components via ref
  useImperativeHandle(ref, () => ({
    handleFileReceived
  }));

  // Send files (drop handler extracted)
  //-----------------------------------------------------------------------------
  const sendFiles = useCallback(
    async (files: File[]) => {
      if (!isCodexNodeActive) {
        setUploadError("Codex node is not active");
        toast.error("Codex node is not active. Cannot upload files.");
        return;
      }
  
      // Check if encryption requirements are met
      if (useEncryption) {
        const encryptionCheck = checkEncryptionRequirements();
        if (!encryptionCheck.success) return;
      }
  
      for (const file of files) {
        const fileId = `upload-${Date.now()}-${file.name}`;
        setUploadingFiles((prev) => ({
          ...prev,
          [fileId]: {
            progress: 0,
            name: file.name,
            size: file.size / (1024 * 1024),
            type: file.type,
          },
        }));
  
        let uploadFileObj: File | Blob = file;
        let encrypted = false;
        let accessCondition: string | undefined;
  
        if (useEncryption) {
          // Use the encryptFile hook function
          const encryptionResult = await encryptFile(file, {
            accessConditionType,
            windowTimeSeconds
          });
          
          if (encryptionResult.encryptedFile) {
            uploadFileObj = encryptionResult.encryptedFile;
            encrypted = true;
            accessCondition = encryptionResult.accessCondition;
          } else {
            // Encryption failed, show error
            setUploadError("Encryption failed");
            continue;
          }
        }
  
        try {
          const res = await codexUploadFile(
            uploadFileObj instanceof File ? uploadFileObj : new File([uploadFileObj], file.name), 
            (progress) => {
              setUploadingFiles((prev) => ({
                ...prev,
                [fileId]: {
                  ...(prev[fileId] || {}),
                  progress,
                },
              }));
            }
          );
  
          // Create file item with helper function
          const newSentFile = prepareFileMetadata(file, fileId, {
            isEncrypted: encrypted,
            accessCondition
          });
          
          // Add file ID from Codex response
          newSentFile.fileId = res.id ?? undefined;
          
          // Add to sent files
          addSentFile(newSentFile);
          
          // Notify others via Waku
          await sendFileMessage({
            fileName: newSentFile.name,
            fileSize: newSentFile.size,
            fileType: newSentFile.type,
            fileId: newSentFile.fileId!,
            isEncrypted: newSentFile.isEncrypted,
            accessCondition: newSentFile.accessCondition,
          });
        } catch (err) {
          setUploadError("Upload failed: " + (err instanceof Error ? err.message : ""));
        } finally {
          setUploadingFiles((prev) => {
            const { [fileId]: _removed, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [
      isCodexNodeActive,
      useEncryption,
      checkEncryptionRequirements,
      accessConditionType,
      windowTimeSeconds,
      encryptFile,
      codexUploadFile,
      addSentFile,
      sendFileMessage
    ]
  );

  //-----------------------------------------------------------------------------
  // Copy & Download helpers (simplified)
  //-----------------------------------------------------------------------------
  const copyFileCid = useCallback(async (fid: string) => {
    const file = findFileById(fid);
    if (!file || !file.fileId) return;
    
    try {
      const success = await copyToClipboard(file.fileId);
      if (success) {
        setCopySuccess("CID copied");
        setTimeout(() => setCopySuccess(null), 2000);
      } else {
        setUploadError("Failed to copy CID");
      }
    } catch {
      setUploadError("Failed to copy CID");
    }
  }, [findFileById]);

  const downloadFile = useCallback(
    async (fid: string) => {
      console.log(`Starting download for file ID: ${fid}`);
      const file = findFileById(fid);
      if (!file || !file.fileId) {
        setUploadError("File not found");
        toast.error("File not found", {
          description: `Could not find file with ID: ${fid}`
        });
        console.error(`File not found for ID: ${fid}`);
        return;
      }
  
      console.log(`Processing download for: ${file.name} (encrypted: ${file.isEncrypted ? 'yes' : 'no'})`);
      
      try {
        setUploadError(null); // Clear any previous errors
        setCopySuccess(`Downloading ${file.name}...`);
        
        const res = await codexDownloadFile(file.fileId);
        if (!res.success || !res.data) {
          const errorMsg = res.error || "Download failed";
          setUploadError(errorMsg);
          toast.error("Download failed", { description: errorMsg });
          console.error(`Codex download failed:`, res.error);
          return;
        }
  
        // Handle encrypted files with our new hook
        if (file.isEncrypted) {
          console.log(`Processing encrypted file with condition: ${file.accessCondition}`);
          
          setCopySuccess(`Decrypting ${file.name}...`);
          
          const decryptResult = await decryptBlob(
            res.data as Blob, 
            file.type, 
            file.accessCondition
          );
          
          if (!decryptResult.decryptedBlob) {
            setUploadError(decryptResult.error || "Decryption failed");
            setCopySuccess(null);
            return;
          }
          
          // Download the decrypted blob
          downloadFileFromBlob(decryptResult.decryptedBlob, file.name);
        } else {
          // Download regular file
          downloadFileFromBlob(res.data as Blob, file.name);
        }
        
        setCopySuccess(`Downloaded ${file.name} successfully`);
        setTimeout(() => setCopySuccess(null), 3000);
        console.log(`Download complete for ${file.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown download error";
        console.error(`Download error:`, errorMsg);
        setUploadError(errorMsg);
        setCopySuccess(null);
      }
    },
    [findFileById, codexDownloadFile, decryptBlob]
  );

  //-----------------------------------------------------------------------------
  // Provider value - all functionality orchestrated through this context
  //-----------------------------------------------------------------------------
  const ctxValue: FileTransferContextType = {
    // State
    sentFiles,
    receivedFiles,
    uploadingFiles,
    uploadError,
    copySuccess,
    
    // Core file operations
    sendFiles,
    copyFileCid,
    downloadFile,
    
    // Status forwarded from other contexts
    isTacoInit,
    wakuPeerCount,
    isWakuConnected,
    isWakuConnecting,
  };

  return (
    <FileTransferContext.Provider value={ctxValue}>{children}</FileTransferContext.Provider>
  );
});
