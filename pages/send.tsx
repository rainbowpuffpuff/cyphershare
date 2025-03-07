import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Copy, Check, FileIcon, FileText, File } from "lucide-react";
import Link from "next/link";
import Head from "next/head";
import { toast } from "sonner";
import { Header } from "@/components/header";

export default function SendFile() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      toast.success("File selected successfully!");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB max size
  });

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // In a real application, you would upload the file to a server here
      // For this example, we'll simulate an upload with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a random share ID (in a real app, this would come from the server)
      const randomId = Math.random().toString(36).substring(2, 10);
      setShareId(randomId);
      
      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload file. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyShareId = () => {
    if (shareId) {
      navigator.clipboard.writeText(shareId);
      setCopied(true);
      toast.success("Share ID copied to clipboard!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleReset = () => {
    setFile(null);
    setShareId(null);
  };

  // Function to get file icon based on file type
  const getFileIcon = () => {
    if (!file) return <FileIcon size={40} />;
    
    const fileType = file.type.split('/')[0];
    
    switch (fileType) {
      case 'image':
        return <FileIcon size={40} />;
      case 'video':
        return <FileIcon size={40} />;
      case 'audio':
        return <FileIcon size={40} />;
      case 'text':
      case 'application':
        return <FileText size={40} />;
      default:
        return <File size={40} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <Head>
        <title>Send File - FileShare</title>
        <meta name="description" content="Upload and share files securely" />
      </Head>
      
      <Header />
      
      <main className="flex-1 flex flex-col p-4 md:p-8 relative z-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted mr-2 group-hover:bg-primary/10 transition-colors">
                <ArrowLeft size={16} className="group-hover:text-primary transition-colors" />
              </div>
              Back to Home
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Send a File</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Upload a file and get a unique share ID to share with others.</p>
          </div>
          
          <Card className="w-full border-primary/10 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Upload size={20} />
                </div>
                <div>
                  <CardTitle>Upload File</CardTitle>
                  <CardDescription>
                    Drag & drop or select a file to upload
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!file ? (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
                    isDragActive 
                      ? "border-primary bg-primary/5 scale-[0.99]" 
                      : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className={`p-4 rounded-full bg-muted transition-transform ${isDragActive ? 'scale-110' : ''}`}>
                      <Upload size={36} className={`transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <h3 className="text-lg font-medium mt-2">
                      {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      or click to select a file
                    </p>
                    <div className="px-4 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                      Maximum file size: 100MB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6 bg-muted/10">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <div className="p-1 rounded-full bg-primary/10">
                      <FileIcon size={16} className="text-primary" />
                    </div>
                    Selected File
                  </h3>
                  <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-background text-primary">
                        {getFileIcon()}
                      </div>
                      <div className="truncate">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "Unknown type"}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset} className="ml-4">
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end pt-4">
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="min-w-32 relative overflow-hidden"
              >
                {isUploading ? (
                  <>
                    <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                    <span className="relative">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      <Dialog open={!!shareId} onOpenChange={(open) => !open && handleReset()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-green-100 text-green-600">
                <Check size={14} />
              </div>
              File Ready to Share
            </DialogTitle>
            <DialogDescription>
              Your file has been uploaded successfully. Share this ID with the recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 p-4 rounded-lg mt-4">
            <p className="text-xs text-muted-foreground mb-2">Share ID</p>
            <div className="flex items-center space-x-2">
              <Input
                value={shareId || ""}
                readOnly
                className="font-mono text-center bg-background"
              />
              <Button 
                size="icon" 
                variant={copied ? "default" : "outline"}
                onClick={handleCopyShareId}
                aria-label="Copy share ID"
                className={`transition-all ${copied ? 'bg-green-600 text-white' : ''}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The recipient will need this ID to download your file.
          </p>
          <DialogFooter className="mt-6 sm:justify-between">
            <Button variant="outline" onClick={handleReset}>
              Upload Another File
            </Button>
            <Link href="/">
              <Button variant="default">
                Back to Home
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 