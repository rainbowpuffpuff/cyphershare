import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Geist, Geist_Mono } from "next/font/google";
import { Upload, Download, FileIcon, Copy, Edit, Check, File, FileText, Image, Github } from "lucide-react";
import Link from "next/link";
import Head from "next/head";
import { Header } from "@/components/header";
import { useDropzone } from "react-dropzone";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Mock data for sent and received files
interface FileItem {
  id: number;
  name: string;
  size: number;
  type: string;
  timestamp: string;
}

const mockSentFiles: FileItem[] = [
  { id: 1, name: "document.pdf", size: 2.4, type: "application/pdf", timestamp: "2023-06-15 14:30" },
  { id: 2, name: "image.jpg", size: 1.8, type: "image/jpeg", timestamp: "2023-06-15 14:35" },
  { id: 3, name: "spreadsheet.xlsx", size: 0.9, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", timestamp: "2023-06-15 15:10" },
];

const mockReceivedFiles: FileItem[] = [
  { id: 1, name: "presentation.pptx", size: 5.2, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", timestamp: "2023-06-15 13:45" },
  { id: 2, name: "archive.zip", size: 10.5, type: "application/zip", timestamp: "2023-06-15 16:20" },
];

export default function Home() {
  const [roomId, setRoomId] = useState("XYZ123");
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: () => {}, // No functionality, just UI
    maxSize: 100 * 1024 * 1024, // 100MB max size
  });

  // Function to get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) {
      return <Image size={24} />;
    } else if (fileType.includes('pdf')) {
      return <FileText size={24} />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('xlsx')) {
      return <FileText size={24} />;
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint') || fileType.includes('pptx')) {
      return <FileText size={24} />;
    } else if (fileType.includes('zip') || fileType.includes('archive')) {
      return <File size={24} />;
    } else {
      return <FileIcon size={24} />;
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background flex flex-col dark`}>
      <Head>
        <title>FileShare - Secure File Sharing</title>
        <meta name="description" content="Securely share files with anyone" />
      </Head>
      
      {/* Header with logo and GitHub icon */}
      <header className="w-full border-b border-border bg-card z-10 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileIcon size={20} className="text-primary" />
            </div>
            <span className="font-bold text-lg">FileShare</span>
          </div>
          
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="View on GitHub"
          >
            <Github size={20} className="text-foreground" />
          </a>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col p-4 md:p-8 relative z-0">
        <div className="w-full max-w-5xl mx-auto">
          {/* Room ID Section - Now below header */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 border border-border rounded-md px-4 py-2 bg-card shadow-sm">
              <span className="text-sm font-medium text-secondary-foreground">Room ID:</span>
              <div className="relative w-[180px]">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={!isEditingRoom}
                  className={`h-8 font-mono text-base px-3 ${isEditingRoom ? "border-primary ring-1 ring-primary/30" : ""}`}
                />
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingRoom(!isEditingRoom)}
                  className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground"
                  aria-label={isEditingRoom ? "Save room ID" : "Edit room ID"}
                >
                  {isEditingRoom ? <Check size={16} className="text-primary" /> : <Edit size={16} />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyRoomId}
                  className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground"
                  aria-label="Copy room ID"
                >
                  {copiedRoom ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all mb-8 bg-card shadow-sm ${
              isDragActive 
                ? "border-primary bg-accent scale-[0.99]" 
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={`p-4 rounded-full bg-accent transition-transform ${isDragActive ? 'scale-110' : ''}`}>
                <Upload size={36} className={`transition-colors ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
              </div>
              <h3 className="text-lg font-medium mt-2">
                {isDragActive ? "Drop the file here" : "Drag & drop files here"}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                or click to select files
              </p>
              <div className="px-4 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                Maximum file size: 100MB
              </div>
            </div>
          </div>

          {/* Sent and Received Files Tabs */}
          <Tabs defaultValue="sent" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Upload size={16} />
                Sent Files
              </TabsTrigger>
              <TabsTrigger value="received" className="flex items-center gap-2">
                <Download size={16} />
                Received Files
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sent">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border bg-card">
                  <CardTitle className="text-lg">Files You've Sent</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-card">
                  <div className="h-[250px] overflow-y-auto pr-2 p-4">
                    {mockSentFiles.length > 0 ? (
                      <div className="space-y-3">
                        {mockSentFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                {getFileIcon(file.type)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{file.size} MB • {file.timestamp}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground">
                              <Copy size={14} />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Add more mock files to demonstrate scrolling */}
                        {[4, 5, 6].map((id) => (
                          <div key={id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                <FileText size={24} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">additional-file-{id}.txt</p>
                                <p className="text-xs text-muted-foreground">1.2 MB • 2023-06-16 09:{id}0</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground">
                              <Copy size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No files sent yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="received">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border bg-card">
                  <CardTitle className="text-lg">Files You've Received</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-card">
                  <div className="h-[250px] overflow-y-auto pr-2 p-4">
                    {mockReceivedFiles.length > 0 ? (
                      <div className="space-y-3">
                        {mockReceivedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                {getFileIcon(file.type)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{file.size} MB • {file.timestamp}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground">
                              <Download size={14} />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Add more mock files to demonstrate scrolling */}
                        {[3, 4, 5].map((id) => (
                          <div key={id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                <Image size={24} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">received-image-{id}.png</p>
                                <p className="text-xs text-muted-foreground">3.{id} MB • 2023-06-17 10:{id}5</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent text-accent-foreground">
                              <Download size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No files received yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <footer className="border-t border-border py-6 mt-16 relative z-0">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FileShare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
