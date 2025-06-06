// pages/index.tsx
import MainLayout from "@/components/layout/MainLayout";
import { FileUpload } from "@/components/files/FileUpload";
import { FileList } from "@/components/files/FileList";
import WakuDebugConsole from "@/components/debug-consoles/WakuDebugConsole";
import CodexDebugConsole from "@/components/debug-consoles/CodexDebugConsole";
import TacoDebugConsole from "@/components/debug-consoles/TacoDebugConsole";
import Head from "next/head";
import { useState, useCallback, useRef } from "react";
import { FileItem } from "@/types/files";
import PyodideRunnerModal from "@/components/pyodide/PyodideRunnerModal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Mail, Send, Loader2 } from "lucide-react";
import { calculateSha256, copyToClipboard } from "@/utils/fileUtils";
import { useWallet } from "@/context/WalletContext";

export default function Home() {
  const [isPyodideModalOpen, setIsPyodideModalOpen] = useState(false);
  const [selectedPyFileForModal, setSelectedPyFileForModal] =
    useState<FileItem | null>(null);
  const [processingPyFileId, setProcessingPyFileId] = useState<string | null>(
    null
  );

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofData, setProofData] = useState<{
    file: FileItem;
    scriptContent: string;
    secret: string;
    scriptHash: string;
  } | null>(null);
  const [selectedEmlFile, setSelectedEmlFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const emlFileInputRef = useRef<HTMLInputElement>(null);
  const { walletAddress, walletConnected } = useWallet();

  const handleViewPyFileRequest = useCallback((file: FileItem) => {
    if (!file.fileId) {
      toast.error("Cannot view script: File ID is missing.");
      return;
    }
    setProcessingPyFileId(file.id.toString());
    setSelectedPyFileForModal(file);
    setIsPyodideModalOpen(true);
  }, []);

  const handlePyodideModalOpenChange = useCallback((isOpen: boolean) => {
    setIsPyodideModalOpen(isOpen);
    if (!isOpen) {
      setSelectedPyFileForModal(null);
      setProcessingPyFileId(null);
    }
  }, []);

  const handleOpenProofSubmissionModal = useCallback(
    async (file: FileItem, scriptContent: string, secret: string) => {
      if (!walletConnected) {
        toast.error("Please connect your wallet to submit a proof.");
        return;
      }
      const hash = (await calculateSha256(scriptContent)) + secret;
      setProofData({ file, scriptContent, secret, scriptHash: hash });
      setIsProofModalOpen(true);
      setIsPyodideModalOpen(false);
    },
    [walletConnected]
  );

  const handleSubmitEmailProof = useCallback(async () => {
    if (!proofData || !selectedEmlFile || !walletAddress) {
      toast.error("Missing required data for proof submission.");
      return;
    }
    setIsSubmittingProof(true);

    try {
      toast.info("Submitting email proof to the server...");
      const emlContent = await selectedEmlFile.text();

      const response = await fetch("/api/submit-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emlContent,
          scriptContent: proofData.scriptContent,
          secret: proofData.secret,
          walletAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `API request failed with status ${response.status}`
        );
      }

      toast.success("Email proof submitted successfully!");
      console.log("Proof Result:", data.result);

      setIsProofModalOpen(false);
      setProofData(null);
      setSelectedEmlFile(null);
    } catch (error) {
      console.error("Error submitting email proof:", error);
      toast.error(
        `Proof submission error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmittingProof(false);
    }
  }, [proofData, selectedEmlFile, walletAddress]);

  return (
    <>
      <Head>
        <title>CypherShare</title>
        <meta
          name="description"
          content="Simple filesharing using Codex, Waku, TACo, and Pyodide"
        />
      </Head>
      <MainLayout>
        <div className="container max-w-5xl py-8 mx-auto">
          <FileUpload />
          <div className="mt-6">
            <FileList
              onViewPyFile={handleViewPyFileRequest}
              processingPyFileId={processingPyFileId}
            />
          </div>
          <WakuDebugConsole />
          <CodexDebugConsole />
          <TacoDebugConsole />
        </div>
      </MainLayout>

      {isPyodideModalOpen && selectedPyFileForModal && (
        <PyodideRunnerModal
          isOpen={isPyodideModalOpen}
          onOpenChange={handlePyodideModalOpenChange}
          pythonFile={selectedPyFileForModal}
          onOpenProofModal={handleOpenProofSubmissionModal}
        />
      )}

      {isProofModalOpen && proofData && (
        <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
          <DialogContent className="sm:max-w-[700px] flex flex-col bg-card border-border">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="font-mono text-primary flex items-center gap-2">
                <Mail size={18} />
                Submit Computation Email Proof
              </DialogTitle>
              <DialogDescription className="font-mono text-muted-foreground">
                To finalize your computation claim, please prepare and upload an
                .eml file.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm font-mono">
              <p className="text-foreground/90">
                1. <strong className="text-primary">Compose an Email:</strong>
              </p>
              <div className="ml-4 p-3 bg-muted/50 border border-input rounded-md space-y-2">
                <p>
                  <strong className="text-muted-foreground">From:</strong> Your
                  DKIM-verifiable email address.
                </p>
                <p>
                  <strong className="text-muted-foreground">To:</strong> (Can be
                  yourself or any address)
                </p>
                <div>
                  <strong className="text-muted-foreground">
                    Subject (Exact):
                  </strong>
                  <div className="mt-1 p-2 bg-background border border-input rounded text-xs text-primary break-all flex items-center gap-2">
                    <span>
                      Claim reward for running the computation on my private
                      data
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(
                          "Claim reward for running the computation on my private data"
                        ).then(() => toast.success("Subject copied!"))
                      }
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
                <div>
                  <strong className="text-muted-foreground">
                    Body (Exact - Plain Text):
                  </strong>
                  <div className="mt-1 p-2 bg-background border border-input rounded text-xs text-primary break-all flex items-center gap-2">
                    <span>{proofData.scriptHash}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(proofData.scriptHash || "").then(() =>
                          toast.success("Hash copied!")
                        )
                      }
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-foreground/90">
                2.{" "}
                <strong className="text-primary">Send & Download .eml:</strong>{" "}
                Send the email, then download it as an `.eml` file from your
                mail client.
              </p>
              <p className="text-foreground/90">
                3. <strong className="text-primary">Upload .eml File:</strong>
              </p>
              <div className="ml-4">
                <Input
                  type="file"
                  accept=".eml"
                  ref={emlFileInputRef}
                  className="font-mono text-sm file:text-primary file:font-mono"
                  onChange={(e) =>
                    setSelectedEmlFile(
                      e.target.files ? e.target.files[0] : null
                    )
                  }
                />
                {selectedEmlFile && (
                  <p className="text-xs text-green-400 mt-1">
                    Selected: {selectedEmlFile.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                className="font-mono"
                onClick={() => setIsProofModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="font-mono"
                onClick={handleSubmitEmailProof}
                disabled={
                  !selectedEmlFile || isSubmittingProof || !walletConnected
                }
              >
                {isSubmittingProof ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Send size={14} className="mr-2" />
                )}
                {isSubmittingProof ? "Submitting..." : "Submit Proof"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
