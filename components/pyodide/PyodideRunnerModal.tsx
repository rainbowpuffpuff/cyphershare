import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileItem } from "@/types/files";
import { useFileTransfer } from "@/context/FileTransferContext";
import { useFileEncryption } from "@/hooks/useFileEncryption";
import { useCodexContext } from "@/context/CodexContext";
import { Loader2, Mail } from "lucide-react";
import { usePyodide, PyodideFile } from "@/hooks/usePyodide";

interface PyodideRunnerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pythonFile: FileItem | null;
  onOpenProofModal: (
    file: FileItem,
    scriptContent: string,
    secret: string
  ) => void;
}

export default function PyodideRunnerModal({
  isOpen,
  onOpenChange,
  pythonFile,
  onOpenProofModal,
}: PyodideRunnerModalProps) {
  const {
    isPyodideReady,
    pyodideLoadingMessage,
    ensurePyodideLoaded,
    loadFilesToFs,
    setGlobalVariable,
    runPythonAsync: runPyodideScript,
  } = usePyodide();

  const [pyFileContent, setPyFileContent] = useState("");
  const [selectedDataFiles, setSelectedDataFiles] = useState<FileList | null>(
    null
  );
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const [pyodideOutput, setPyodideOutput] = useState<string[]>([]);
  const [isScriptRunning, setIsScriptRunning] = useState(false);
  const [computationSecret, setComputationSecret] = useState<string | null>(
    null
  );

  const { decryptBlob } = useFileEncryption();
  const { downloadFile: codexDownloadFileContent } = useCodexContext();

  useEffect(() => {
    if (isOpen) {
      ensurePyodideLoaded().catch((err) => {
        console.error("Modal: Pyodide failed to load via hook", err);
        toast.error("Pyodide engine could not be loaded.");
      });
    }
  }, [isOpen, ensurePyodideLoaded]);

  useEffect(() => {
    if (!isOpen || !pythonFile || !pythonFile.fileId) {
      setPyFileContent("");
      return;
    }
    const fetchContent = async () => {
      toast.info(`Fetching ${pythonFile.name}...`);
      try {
        const result = await codexDownloadFileContent(pythonFile.fileId!);
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to download script.");
        }
        let blob = result.data;
        if (pythonFile.isEncrypted) {
          toast.info(`Decrypting ${pythonFile.name}...`);
          const decryptResult = await decryptBlob(blob, {
            fileType: "text/plain",
            accessCondition: pythonFile.accessCondition,
          });
          if (!decryptResult.decryptedBlob) {
            throw new Error(
              decryptResult.error?.message || "Decryption failed."
            );
          }
          blob = decryptResult.decryptedBlob;
        }
        const content = await blob.text();
        setPyFileContent(content);
        toast.success(`${pythonFile.name} content loaded.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Error loading script: ${msg}`);
        setPyFileContent(`# Error loading script: ${msg}`);
      }
    };
    fetchContent();
  }, [isOpen, pythonFile, codexDownloadFileContent, decryptBlob]);

  const handleRunScript = useCallback(async () => {
    if (!isPyodideReady || !pyFileContent || !selectedDataFiles?.length) {
      toast.error(
        "Pyodide not ready, script missing, or no data files selected."
      );
      return;
    }

    setIsScriptRunning(true);
    setComputationSecret(null);
    const initialOutput = [
      `Running script: ${pythonFile?.name || "script.py"}...`,
    ];
    setPyodideOutput(initialOutput);
    toast.info(`Running script: ${pythonFile?.name || "script.py"}`);

    try {
      const currentOutput: string[] = [...initialOutput];
      const appendOutput = (msg: string) => {
        currentOutput.push(msg);
        setPyodideOutput([...currentOutput]);
      };

      appendOutput("Loading data files into Pyodide FS...");
      const pyodideFilesToLoad: Promise<PyodideFile>[] = Array.from(
        selectedDataFiles
      ).map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return { name: file.name, content: new Uint8Array(arrayBuffer) };
      });
      const loadedDataFilePaths = await loadFilesToFs(
        await Promise.all(pyodideFilesToLoad),
        "/home"
      );

      loadedDataFilePaths.forEach((path, index) => {
        appendOutput(`Loaded ${selectedDataFiles[index].name} to ${path}`);
      });

      appendOutput(
        "Making file paths available to Python as 'SELECTED_DATA_FILES'"
      );
      setGlobalVariable("SELECTED_DATA_FILES", loadedDataFilePaths);

      appendOutput("Executing Python script...");
      const result = await runPyodideScript(
        pyFileContent,
        (stdoutMsg) => appendOutput(`[stdout] ${stdoutMsg}`),
        (stderrMsg) => appendOutput(`[stderr] ${stderrMsg}`)
      );
      appendOutput("Script execution finished.");
      if (result !== undefined) appendOutput(`Result: ${String(result)}`);

      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      const newSecret = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setComputationSecret(newSecret);

      appendOutput(
        `------------------------------------------------------------`
      );
      appendOutput(`✅ COMPUTATION SECRET GENERATED: ${newSecret}`);
      appendOutput(`   Keep this secret. You'll need it for the email proof.`);
      appendOutput(
        `------------------------------------------------------------`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setPyodideOutput((prev) => [...prev, `Execution Error: ${errorMsg}`]);
      toast.error(`Script execution error: ${errorMsg}`);
      setComputationSecret(null);
    } finally {
      setIsScriptRunning(false);
    }
  }, [
    isPyodideReady,
    pythonFile,
    pyFileContent,
    selectedDataFiles,
    loadFilesToFs,
    setGlobalVariable,
    runPyodideScript,
  ]);

  const handleOpenProofModal = () => {
    if (pythonFile && computationSecret && pyFileContent) {
      onOpenProofModal(pythonFile, pyFileContent, computationSecret);
    } else {
      toast.error("Cannot open proof modal: missing required data.");
    }
  };

  const handleModalClose = () => {
    onOpenChange(false);
    setPyFileContent("");
    setPyodideOutput([]);
    setSelectedDataFiles(null);
    if (dataFileInputRef.current) dataFileInputRef.current.value = "";
    setIsScriptRunning(false);
    setComputationSecret(null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[900px] lg:max-w-[1100px] h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="font-mono text-primary">
            View & Run: {pythonFile?.name || "Python Script"}
          </DialogTitle>
          <DialogDescription className="font-mono text-muted-foreground">
            View script, select data file(s), run in Pyodide, and optionally
            submit proof.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden min-h-0">
          <div className="flex flex-col overflow-hidden border border-input rounded-md p-1 bg-background">
            <h3 className="text-sm font-mono text-center py-1 text-primary/80">
              Script: {pythonFile?.name || "N/A"}
            </h3>
            <ScrollArea className="flex-grow p-1">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all p-2 text-foreground">
                {pyFileContent || "Loading script content..."}
              </pre>
            </ScrollArea>
          </div>
          <div className="flex flex-col overflow-hidden border border-input rounded-md p-1 bg-background">
            <h3 className="text-sm font-mono text-center py-1 text-primary/80">
              Execution Output & Logs
            </h3>
            <ScrollArea className="flex-grow p-1 mb-2 text-xs font-mono whitespace-pre-wrap break-all bg-black/80 text-green-400 rounded min-h-[100px]">
              {!isPyodideReady && pyodideLoadingMessage && (
                <p className="p-2 text-amber-400">{pyodideLoadingMessage}</p>
              )}
              {isPyodideReady &&
                pyodideOutput.length === 0 &&
                !isScriptRunning && (
                  <p className="p-2 text-green-400">
                    {pyodideLoadingMessage}. Select data file(s) and run script.
                  </p>
                )}
              {pyodideOutput.map((line, index) => (
                <div
                  key={index}
                  className={`p-1 ${
                    line.startsWith("[stderr]") ||
                    line.startsWith("Execution Error:")
                      ? "text-red-400"
                      : line.includes("COMPUTATION SECRET GENERATED")
                      ? "text-green-300 font-bold bg-green-900/30"
                      : ""
                  }`}
                >
                  {line}
                </div>
              ))}
              {isScriptRunning && (
                <div className="p-2 text-blue-400 animate-pulse flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Script is
                  running...
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-2 pt-3 border-t border-border items-center">
          <div className="flex-grow text-xs text-muted-foreground font-mono mr-auto">
            {selectedDataFiles
              ? `${selectedDataFiles.length} data file(s) selected`
              : "No data files selected"}
          </div>
          <Button
            variant="outline"
            className="font-mono"
            onClick={() => dataFileInputRef.current?.click()}
            disabled={!isPyodideReady || isScriptRunning}
          >
            Choose Data File(s)
          </Button>
          <input
            type="file"
            ref={dataFileInputRef}
            className="hidden"
            multiple
            onChange={(e) => {
              setSelectedDataFiles(e.target.files);
              if (e.target.files?.length) {
                toast.info(`Selected ${e.target.files.length} data file(s).`);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="default"
            className="font-mono"
            onClick={handleRunScript}
            disabled={
              !isPyodideReady ||
              isScriptRunning ||
              !selectedDataFiles?.length ||
              !pyFileContent
            }
          >
            {isScriptRunning ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : null}
            {isScriptRunning ? "Running..." : "Run Script"}
          </Button>
          {computationSecret && pythonFile && (
            <Button
              variant="destructive"
              className="font-mono"
              onClick={handleOpenProofModal}
            >
              <Mail size={14} className="mr-2" />
              Submit Email Proof
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline" className="font-mono">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
