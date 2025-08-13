// /context/FileTransferContext.tsx
// Orchestrates file transfer workflow using SwarmContext and TacoContext
// Handles file management state, encrypting/decrypting, and coordinating operations between contexts

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  ReactElement,
} from "react";
import { toast } from "sonner";

import { FileItem } from "@/types/files";
import { useFileEncryption } from "@/hooks/useFileEncryption";
import { useFileList } from "@/hooks/useFileList";
import { prepareFileMetadata, copyToClipboard, downloadFileFromBlob } from "@/utils/fileUtils";

import { useSwarmContext } from "./SwarmContext";
import { useWallet } from "./WalletContext";
import { useSettings } from "./SettingsContext";

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

interface FileTransferContextType {
  // State
  sentFiles: FileItem[];
  receivedFiles: FileItem[];
  uploadingFiles: Record<string, UploadProgress>;
  uploadError: string | null;
  copySuccess: string | null;
  // Actions
  sendFiles: (files: File[]) => Promise<void>;
  copyFileCid: (fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
}

interface UploadProgress {
  progress: number;
  name: string;
  size: number;
  type: string;
  timestamp?: string;
  isEncrypted?: boolean;
  accessCondition?: string;
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
interface Props {
  children: ReactNode;
}

export const FileTransferProvider = ({ children }: Props): ReactElement => {
  const { isPublisher } = useSettings();
  const { networkInfo } = useWallet();

  // Get Swarm functionality from SwarmContext
  const {
    isSwarmNodeActive,
    uploadFile: swarmUploadFile,
    downloadFile: swarmDownloadFile,
  } = useSwarmContext();

  const {
    encryptFile,
    decryptBlob,
    checkEncryptionRequirements,
  } = useFileEncryption();

  // State for file management
  const { sentFiles, receivedFiles, addSentFile } = useFileList();
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, UploadProgress>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Send files (drop handler extracted)
  //-----------------------------------------------------------------------------
  const sendFiles = useCallback(
    async (files: File[]): Promise<void> => {
      if (!isPublisher) {
        toast.error("Uploads are disabled", {
          description: "Please enable Publisher mode in the settings to upload files.",
        });
        return;
      }

      if (!isSwarmNodeActive) {
        setUploadError("Swarm node is not active");
        toast.error("Swarm node is not active. Cannot upload files.");
        return;
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

        try {
          const res = await swarmUploadFile(
            file,
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
          const newSentFile = prepareFileMetadata(file, fileId, {});

          // Add file ID from Swarm response
          newSentFile.fileId = res.id ?? undefined;

          // Add to sent files
          addSentFile(newSentFile);

        } catch (err) {
          setUploadError("Upload failed: " + (err instanceof Error ? err.message : ""));
        } finally {
          setUploadingFiles((prev) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [fileId]: _removed, ...rest } = prev;
            return rest;
          });
        }
      }
    },
    [
      isPublisher,
      isSwarmNodeActive,
      swarmUploadFile,
      addSentFile,
    ]
  );

  //-----------------------------------------------------------------------------
  // Copy & Download helpers (simplified)
  //-----------------------------------------------------------------------------
  const copyFileCid = useCallback(async (fid: string): Promise<void> => {
    const file = sentFiles.find(f => f.fileId === fid) || receivedFiles.find(f => f.fileId === fid);
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
  }, [sentFiles, receivedFiles]);

  const downloadFile = useCallback(
    async (fid: string): Promise<void> => {
      console.log(`Starting download for file ID: ${fid}`);
      const file = sentFiles.find(f => f.fileId === fid) || receivedFiles.find(f => f.fileId === fid);
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

        const res = await swarmDownloadFile(file.fileId);
        if (!res.success || !res.data) {
          const errorMsg = res.error || "Download failed";
          setUploadError(errorMsg);
          toast.error("Download failed", { description: errorMsg });
          console.error(`Swarm download failed:`, res.error);
          return;
        }

        let fileBlob: Blob | null = null;
        // Handle encrypted files with our new hook
        if (file.isEncrypted) {
          console.log(`Processing encrypted file with condition: ${file.accessCondition}`);

          setCopySuccess(`Decrypting ${file.name}...`);

          const result = await decryptBlob(res.data as Blob, {
            fileType: file.type,
            accessCondition: file.accessCondition,
          });
          if (result.decryptedBlob) {
            fileBlob = result.decryptedBlob;
          } else {
            setUploadError(result.error?.message || "Decryption failed");
            setCopySuccess(null);
            return;
          }
        } else {
          // Download regular file
          fileBlob = res.data as Blob;
        }

        downloadFileFromBlob(fileBlob!, file.name);
        setCopySuccess(`Downloaded ${file.name} successfully`);
        setTimeout(() => setCopySuccess(null), 3000);
        console.log(`Download complete for ${file.name}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown download error";
        setUploadError(errorMessage);
        setCopySuccess(null);
      }
    },
    [sentFiles, receivedFiles, swarmDownloadFile, decryptBlob]
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
  };

  return (
    <FileTransferContext.Provider value={ctxValue}>{children}</FileTransferContext.Provider>
  );
};

