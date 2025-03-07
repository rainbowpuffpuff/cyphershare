import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileDown, FileSearch, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Head from "next/head";
import { toast } from "sonner";
import { Header } from "@/components/header";

export default function ReceiveFile() {
  const [shareId, setShareId] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isValidId, setIsValidId] = useState(true);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleShareIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setShareId(value);
    
    // Simple validation - in a real app, you might want to check against a pattern
    setIsValidId(value.trim().length >= 4);
    
    // Reset download complete state when changing the ID
    if (downloadComplete) {
      setDownloadComplete(false);
    }
  };

  const handleDownload = async () => {
    if (!shareId.trim() || !isValidId) {
      toast.error("Please enter a valid share ID");
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // In a real application, you would fetch the file from a server here
      // For this example, we'll simulate a download with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate a successful download
      toast.success("File downloaded successfully!");
      setDownloadComplete(true);
      
      // In a real app, you would trigger the file download here
      // For example:
      // const url = URL.createObjectURL(new Blob([fileData]));
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = fileName;
      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);
      
    } catch (error) {
      toast.error("Failed to download file. Please check the share ID and try again.");
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setShareId("");
    setDownloadComplete(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <Head>
        <title>Receive File - FileShare</title>
        <meta name="description" content="Download shared files securely" />
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
            <h1 className="text-3xl font-bold mb-2">Receive a File</h1>
            <p className="text-muted-foreground max-w-md mx-auto">Enter the share ID to download the shared file.</p>
          </div>
          
          <Card className="w-full border-primary/10 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Download size={20} />
                </div>
                <div>
                  <CardTitle>Download File</CardTitle>
                  <CardDescription>
                    Enter the share ID you received
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="shareId" className="text-sm font-medium flex items-center gap-2">
                    <FileSearch size={14} className="text-muted-foreground" />
                    Share ID
                  </label>
                  <Input
                    id="shareId"
                    placeholder="Enter the share ID you received"
                    value={shareId}
                    onChange={handleShareIdChange}
                    className={`transition-all ${!isValidId && shareId ? "border-red-500 focus-visible:ring-red-500" : ""} ${downloadComplete ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                  />
                  {!isValidId && shareId && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                      Please enter a valid share ID (at least 4 characters)
                    </p>
                  )}
                </div>
                
                <div className={`bg-muted/50 p-5 rounded-lg flex items-start gap-4 transition-all ${downloadComplete ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                  <div className={`p-3 rounded-full ${downloadComplete ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>
                    {downloadComplete ? <CheckCircle2 size={24} /> : <FileDown size={24} />}
                  </div>
                  <div>
                    <h4 className="text-base font-medium">
                      {downloadComplete ? "Download Complete" : "Ready to Download"}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {downloadComplete 
                        ? "Your file has been downloaded successfully." 
                        : "Enter the share ID above and click the download button to receive your file."}
                    </p>
                    
                    {downloadComplete && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleReset}
                        className="mt-3"
                      >
                        Download Another File
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4">
              <Button 
                onClick={handleDownload} 
                disabled={!shareId.trim() || !isValidId || isDownloading || downloadComplete}
                className="min-w-32 relative overflow-hidden"
              >
                {isDownloading ? (
                  <>
                    <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
                    <span className="relative">Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Download File
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center p-2 bg-muted rounded-full mb-4">
              <FileSearch size={18} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-left">
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">1</div>
                  <h3 className="font-medium">Get the Share ID</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask the sender for the unique share ID they received after uploading the file.
                </p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">2</div>
                  <h3 className="font-medium">Enter the ID</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the share ID in the input field above to locate the file.
                </p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">3</div>
                  <h3 className="font-medium">Download</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the download button to retrieve the file securely to your device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 