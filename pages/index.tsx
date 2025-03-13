import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Geist, Geist_Mono } from "next/font/google";
import { Upload, Download, FileIcon, Copy, Edit, Check, File, FileText, Image, Github, Settings, Server, Radio, Terminal, AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import Head from "next/head";
import { useDropzone } from "react-dropzone";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose,
  SheetTrigger
} from "@/components/ui/sheet";
import { useCodex } from "@/hooks/useCodex";

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
  const [codexNodeUrl, setCodexNodeUrl] = useState("http://localhost:8080/api/codex");
  const [wakuNodeUrl, setWakuNodeUrl] = useState("http://127.0.0.1:8645");
  const [wakuNodeType, setWakuNodeType] = useState("light");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [nodeInfo, setNodeInfo] = useState<any | null>(null);
  
  // Initialize Codex client with default URL
  const { 
    isNodeActive: isCodexNodeActive, 
    isLoading: isCodexLoading,
    updateBaseUrl: updateCodexUrl,
    checkNodeStatus: checkCodexStatus,
    error: codexError,
    getNodeInfo
  } = useCodex(codexNodeUrl);

  // Fetch node info when node is active
  useEffect(() => {
    if (isCodexNodeActive && !isCodexLoading) {
      const fetchNodeInfo = async () => {
        const info = await getNodeInfo();
        if (info) {
          setNodeInfo(info);
        }
      };
      
      fetchNodeInfo();
    } else {
      setNodeInfo(null);
    }
  }, [isCodexNodeActive, isCodexLoading, getNodeInfo]);

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

  // Handle Codex URL change
  const handleCodexUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodexNodeUrl(e.target.value);
  };

  // Update Codex URL when Save button is clicked
  const handleSaveConfig = () => {
    // Basic URL validation
    if (!codexNodeUrl.trim() || !codexNodeUrl.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    setIsSaving(true);
    updateCodexUrl(codexNodeUrl);
    
    // Show success indicator briefly
    setSaveSuccess(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background flex flex-col dark`}>
      <Head>
        <title>FileShare - Secure File Sharing</title>
        <meta name="description" content="Securely share files with anyone" />
      </Head>
      
      <main className="flex-1 flex flex-col p-4 md:p-8 relative z-0">
        <div className="w-full max-w-5xl mx-auto">
          {/* Combined Logo and Room ID Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 group md:w-1/4">
              <div className="p-2 rounded-lg bg-primary/15 shadow-sm group-hover:bg-primary/20 transition-all duration-300 border border-primary/10">
                <Terminal size={22} className="text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex items-center">
                <span className="font-bold text-lg tracking-tight font-mono">FileShare</span>
              </div>
              <div className="hidden md:flex items-center h-6 px-2.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-muted-foreground font-mono">
                alpha
              </div>
            </div>
            
            {/* Room ID - Centered */}
            <div className="flex items-center justify-center md:w-2/4 w-full">
              <div className="inline-flex items-center gap-2 border border-border rounded-md px-4 py-2 bg-card shadow-sm w-full md:max-w-[350px] relative overflow-hidden">
                <span className="text-sm font-medium text-secondary-foreground whitespace-nowrap font-mono">Room ID:</span>
                <div className="relative w-full md:w-[180px]">
                  <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={!isEditingRoom}
                    className={`h-8 font-mono text-base px-3 ${isEditingRoom ? "border-primary ring-1 ring-primary/30" : ""} bg-opacity-70`}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
              </div>
            </div>
            
            {/* Icons */}
            <div className="flex items-center gap-3 shrink-0 md:w-1/4 md:justify-end">
              <a 
                href="https://github.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-accent/80 hover:scale-105 transition-all duration-200 flex items-center justify-center border border-primary/20"
                aria-label="View on GitHub"
              >
                <Github size={20} className="text-primary" />
              </a>
              
              {/* Settings Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className="p-2.5 rounded-full hover:bg-accent/80 hover:scale-105 transition-all duration-200 flex items-center justify-center relative border border-primary/20"
                    aria-label="Open settings"
                  >
                    <Settings size={20} className="text-primary" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="p-5 flex flex-col">
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
                  <SheetHeader className="px-1 pb-4 mb-6 border-b border-border">
                    <SheetTitle className="text-xl font-mono">SYSTEM_CONFIG</SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground font-mono">
                      Configure Codex and Waku settings
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-8 px-1 flex-1 overflow-y-auto">
                    {/* Codex Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <Server size={16} className="text-primary" />
                          </div>
                          <h3 className="text-base font-medium font-mono">CODEX_SETTINGS</h3>
                        </div>
                        {isCodexLoading ? (
                          <div className="w-2 h-2 rounded-full bg-amber-700/70 animate-pulse" title="Checking node status..."></div>
                        ) : isCodexNodeActive ? (
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Node is active"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-600/80" title="Node is not active"></div>
                        )}
                      </div>
                      
                      <div className="space-y-4 pl-2 ml-2 border-l border-border">
                        <div className="space-y-2">
                          <label htmlFor="codex-url" className="text-sm font-medium font-mono">API_ENDPOINT</label>
                          <Input 
                            id="codex-url"
                            value={codexNodeUrl}
                            onChange={handleCodexUrlChange}
                            placeholder="http://localhost:8080/api/codex"
                            className="font-mono text-sm bg-card/70"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground font-mono">
                              Codex node API endpoint URL
                            </p>
                            <div className="flex items-center gap-1">
                              {isCodexNodeActive ? (
                                <span className="text-xs text-green-500 font-mono flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600/90 font-mono flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600/80"></span>
                                  {isCodexLoading ? "CHECKING" : "OFFLINE"}
                                </span>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => checkCodexStatus(true)}
                                className="h-6 w-6 p-0 rounded-full"
                                title="Refresh node status"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                  <path d="M21 3v5h-5"></path>
                                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                  <path d="M3 21v-5h5"></path>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          {codexError && (
                            <p className="text-xs text-amber-600/90 font-mono mt-1 flex items-center gap-1">
                              <AlertCircle size={12} />
                              Error: {codexError}
                            </p>
                          )}
                          {!isCodexNodeActive && !isCodexLoading && !codexError && (
                            <p className="text-xs text-amber-600/90 font-mono mt-1 flex items-center gap-1">
                              <AlertCircle size={12} />
                              Codex node is not running in the API endpoint
                            </p>
                          )}
                          
                          {/* Display Node ID and Version when active */}
                          {isCodexNodeActive && nodeInfo && (
                            <div className="mt-3 p-2 bg-card/50 border border-primary/10 rounded-md">
                              <div className="flex items-center gap-1 mb-1">
                                <Info size={12} className="text-primary/70" />
                                <span className="text-xs font-medium text-primary/90 font-mono">NODE_INFO</span>
                              </div>
                              <div className="space-y-1 pl-4 border-l border-primary/10">
                                <p className="text-xs font-mono flex items-center justify-between">
                                  <span className="text-muted-foreground">ID:</span>
                                  <span className="text-primary/80 truncate max-w-[180px]" title={nodeInfo.id}>
                                    {nodeInfo.id.substring(0, 10)}...{nodeInfo.id.substring(nodeInfo.id.length - 4)}
                                  </span>
                                </p>
                                {nodeInfo.codex && (
                                  <p className="text-xs font-mono flex items-center justify-between">
                                    <span className="text-muted-foreground">VERSION:</span>
                                    <span className="text-primary/80">
                                      {nodeInfo.codex.version} ({nodeInfo.codex.revision.substring(0, 7)})
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Waku Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <Radio size={16} className="text-primary" />
                          </div>
                          <h3 className="text-base font-medium font-mono">WAKU_SETTINGS</h3>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-primary/80 animate-pulse" title="Status indicator"></div>
                      </div>
                      
                      <div className="space-y-4 pl-2 ml-2 border-l border-border">
                        <div className="space-y-2">
                          <label className="text-sm font-medium font-mono">NODE_TYPE</label>
                          <Tabs 
                            value={wakuNodeType} 
                            onValueChange={setWakuNodeType}
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-2 font-mono">
                              <TabsTrigger value="light">LIGHT_NODE</TabsTrigger>
                              <TabsTrigger value="relay">RELAY_NODE</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          <p className="text-xs text-muted-foreground font-mono">
                            Select Waku node type
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="waku-url" className="text-sm font-medium font-mono">API_ENDPOINT</label>
                          <Input 
                            id="waku-url"
                            value={wakuNodeUrl}
                            onChange={(e) => setWakuNodeUrl(e.target.value)}
                            placeholder="http://127.0.0.1:8645"
                            className="font-mono text-sm bg-card/70"
                          />
                          <p className="text-xs text-muted-foreground font-mono">
                            nwaku node API endpoint URL
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <SheetFooter className="mt-8 pt-4 border-t border-border flex gap-2 shrink-0">
                    <SheetClose asChild>
                      <Button variant="outline" className="flex-1 font-mono">CANCEL</Button>
                    </SheetClose>
                    <Button 
                      className="flex-1 font-mono" 
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                          SAVING...
                        </span>
                      ) : saveSuccess ? (
                        <span className="flex items-center gap-2">
                          <Check size={16} />
                          SAVED!
                        </span>
                      ) : (
                        "SAVE_CONFIG"
                      )}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Upload Area */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all mb-8 bg-card shadow-sm relative overflow-hidden ${
              isDragActive 
                ? "border-primary bg-accent scale-[0.99]" 
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-3 relative z-10">
              <div className={`p-4 rounded-full bg-accent transition-transform ${isDragActive ? 'scale-110' : ''}`}>
                <Upload size={36} className={`transition-colors ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
              </div>
              <h3 className="text-lg font-medium mt-2 font-mono">
                {isDragActive ? "Drop to share" : "Drag and drop your files here"}
              </h3>
              <p className="text-sm text-muted-foreground mb-2 font-mono">
                or click to select files
              </p>
              <div className="px-4 py-1.5 rounded-full bg-muted text-xs text-muted-foreground font-mono border border-primary/10">
                MAX_SIZE=100MB
              </div>
            </div>
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
          </div>

          {/* Sent and Received Files Tabs */}
          <Tabs defaultValue="sent" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 font-mono">
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Upload size={16} />
                SENT_FILES
              </TabsTrigger>
              <TabsTrigger value="received" className="flex items-center gap-2">
                <Download size={16} />
                RECEIVED_FILES
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sent">
              <Card className="shadow-sm border-border relative overflow-hidden">
                <CardHeader className="pb-3 border-b border-border bg-card">
                  <CardTitle className="text-lg font-mono">Files You've Sent</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-card">
                  <div className="h-[250px] overflow-y-auto pr-2 p-4 relative">
                    {mockSentFiles.length > 0 ? (
                      <div className="space-y-3">
                        {mockSentFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                {getFileIcon(file.type)}
                              </div>
                              <div>
                                <p className="font-medium text-sm font-mono">{file.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{file.size} MB • {file.timestamp}</p>
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
                                <p className="font-medium text-sm font-mono">additional-file-{id}.txt</p>
                                <p className="text-xs text-muted-foreground font-mono">1.2 MB • 2023-06-16 09:{id}0</p>
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
                        <p className="text-muted-foreground font-mono">No files sent yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
              </Card>
            </TabsContent>
            
            <TabsContent value="received">
              <Card className="shadow-sm border-border relative overflow-hidden">
                <CardHeader className="pb-3 border-b border-border bg-card">
                  <CardTitle className="text-lg font-mono">Files You've Received</CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-card">
                  <div className="h-[250px] overflow-y-auto pr-2 p-4 relative">
                    {mockReceivedFiles.length > 0 ? (
                      <div className="space-y-3">
                        {mockReceivedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/20 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-card text-primary shadow-sm border border-border">
                                {getFileIcon(file.type)}
                              </div>
                              <div>
                                <p className="font-medium text-sm font-mono">{file.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{file.size} MB • {file.timestamp}</p>
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
                                <p className="font-medium text-sm font-mono">received-image-{id}.png</p>
                                <p className="text-xs text-muted-foreground font-mono">3.{id} MB • 2023-06-17 10:{id}5</p>
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
                        <p className="text-muted-foreground font-mono">No files received yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
