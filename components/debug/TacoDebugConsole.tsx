// components/debug/TacoDebugConsole.tsx
import { useState, useEffect, useCallback } from "react";
import { XCircle, Info, AlertCircle, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/context/wallet-context";
import { useTacoContext } from "@/context/TacoContext";
import { domains } from "@nucypher/taco";
import { cn } from "@/lib/utils";
import { ethers } from "ethers";

type LogType = "info" | "error" | "success";

interface DebugLog {
  type: LogType;
  message: string;
  timestamp: string;
}

export default function TacoDebugConsole() {
  const { walletConnected, provider } = useWallet();
  const { 
    useEncryption, 
    isTacoInit, 
    networkError, 
    ritualId, 
    domain 
  } = useTacoContext();

  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [networkInfo, setNetworkInfo] = useState<{ name: string; chainId: number } | null>(null);

  // Helper to add a log entry (keeps last 20)
  const addLog = useCallback((type: LogType, message: string) => {
    setLogs((prev) => [
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  // Log encryption status changes
  useEffect(() => {
    addLog("info", `TACo encryption ${useEncryption ? "enabled" : "disabled"}`);
  }, [useEncryption, addLog]);

  // Log wallet connection status changes
  useEffect(() => {
    addLog(
      walletConnected ? "success" : "error",
      walletConnected ? "Wallet connected" : "Wallet not connected"
    );
  }, [walletConnected, addLog]);
  
  // Log TACo initialization status
  useEffect(() => {
    addLog(
      isTacoInit ? "success" : "info",
      isTacoInit ? "TACo initialized" : "TACo not initialized - You need to connect a wallet and enable encryption from settings"
    );
  }, [isTacoInit, addLog]);
  
  // Log network errors
  useEffect(() => {
    if (networkError) {
      addLog("error", `Network error: ${networkError}`);
    }
  }, [networkError, addLog]);

  // Fetch and log network info when provider changes
  useEffect(() => {
    const fetchNetwork = async () => {
      if (!provider) {
        setNetworkInfo(null);
        return;
      }

      try {
        const net = await provider.getNetwork();
        if(net.name === "unknown") {
          switch (net.chainId) {
            case 137:
              net.name = "Polygon";
              break;
            case 80002:
              net.name = "Amoy (Polygon testnet)";
              break;
            case 11155111:
              net.name = "Sepolia (Ethereum testnet)";
              break;
            default:
              net.name = "unknown";
          }
        }
        setNetworkInfo({ name: net.name, chainId: net.chainId });
        addLog("info", `Network: ${net.name} (${net.chainId})`);
      } catch (err) {
        console.error("Failed to get network:", err);
        addLog(
          "error",
          `Failed to fetch network: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };

    fetchNetwork();
  }, [provider, addLog]);

  // Icon helper
  const getLogIcon = (type: LogType) => {
    switch (type) {
      case "info":
        return <Info size={14} className="text-blue-500" />;
      case "error":
        return <AlertCircle size={14} className="text-red-500" />;
      case "success":
        return <CheckCircle size={14} className="text-green-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-44 z-50">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full p-2 h-10 w-10 border border-primary/20 relative shadow-md",
          isOpen ? "bg-primary/10" : "bg-card"
        )}
        title="TACo Debug Console"
      >
        <Shield size={18} className="text-primary" />
        <div
          className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-card",
            isTacoInit && useEncryption ? "bg-green-500 animate-pulse" : 
            isTacoInit ? "bg-amber-500" : "bg-red-500"
          )}
          title={!isTacoInit ? "TACo not initialized" : 
                 useEncryption ? "Encryption enabled" : "Encryption disabled"}
        ></div>
      </Button>

      {/* Panel */}
      {isOpen && (
        <div className="bg-card border border-border rounded-lg shadow-lg w-80 sm:w-96 absolute bottom-12 right-0 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <span className="font-mono text-sm">TACO_DEBUG_CONSOLE</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <XCircle size={16} className="text-muted-foreground hover:text-primary transition-colors" />
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
              {networkInfo && (
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  {networkInfo.name} 
                  {/* ({networkInfo.chainId}) */}
                </span>
              )}
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {domain}
              </span>
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                Ritual {ritualId}
              </span>
            </div>
          </div>
          <ScrollArea className="h-64 bg-black/90">
            <div className="p-2 font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="text-muted-foreground p-2 text-center">No logs yet</div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-1 hover:bg-white/5 rounded"
                  >
                    <span className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                    <span className="text-muted-foreground">[{log.timestamp}]</span>
                    <span
                      className={cn(
                        log.type === "info" && "text-blue-300",
                        log.type === "error" && "text-red-300",
                        log.type === "success" && "text-green-300"
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex border-t border-border">
            <Button
              onClick={() => setLogs([])}
              variant="ghost"
              className="flex-1 h-8 text-xs font-mono rounded-none text-red-400"
            >
              Clear Logs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
