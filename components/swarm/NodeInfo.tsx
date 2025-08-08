// components/swarm/NodeInfo.tsx
import { Card } from "@/components/ui/card";
import { Server } from "lucide-react";
import { useState, useEffect } from "react";
import { useSwarmContext } from "@/context/SwarmContext";
import { SwarmNodeInfo } from "@/hooks/useSwarm";

export default function NodeInfo() {
  const { isSwarmNodeActive, getNodeInfo, swarmError } = useSwarmContext();
  const [nodeInfo, setNodeInfo] = useState<SwarmNodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSwarmNodeActive) {
      setIsLoading(true);
      getNodeInfo()
        .then(setNodeInfo)
        .catch((err) => console.error("Failed to get Swarm node info:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isSwarmNodeActive, getNodeInfo]);

  if (swarmError) {
    return (
      <Card className="bg-card border border-border p-4 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
            <Server size={16} className="text-red-500" />
          </div>
          <h3 className="text-sm font-medium font-mono text-red-500">NODE_ERROR</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          {swarmError}
        </p>
      </Card>
    );
  }

  if (!isSwarmNodeActive) {
    return (
      <Card className="bg-card border border-border p-4 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Server size={16} className="text-amber-500" />
          </div>
          <h3 className="text-sm font-medium font-mono text-amber-500">NODE_OFFLINE</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Swarm node is not connected.
        </p>
      </Card>
    );
  }

  if (isLoading) {
      return (
        <Card className="bg-card border border-border p-4 relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-5 w-32 bg-muted rounded"></div>
          </div>
          <div className="mt-2 space-y-2">
            <div className="animate-pulse h-4 w-full bg-muted rounded"></div>
            <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
            <div className="animate-pulse h-4 w-2/3 bg-muted rounded"></div>
          </div>
        </Card>
      );
  }

  return (
    <Card className="bg-card border border-border p-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/10">
            <Server size={16} className="text-primary" />
          </div>
          <h3 className="text-sm font-medium font-mono">SWARM_NODE_INFO</h3>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm font-mono">
        {nodeInfo?.version && (
          <div className="flex items-start">
            <span className="text-xs text-muted-foreground w-32 flex-shrink-0">VERSION:</span>
            <span className="text-xs">{nodeInfo.version}</span>
          </div>
        )}
        {nodeInfo?.beeMode && (
          <div className="flex items-start">
            <span className="text-xs text-muted-foreground w-32 flex-shrink-0">BEE_MODE:</span>
            <span className="text-xs">{nodeInfo.beeMode}</span>
          </div>
        )}
        {nodeInfo?.chequebookEnabled !== undefined && (
          <div className="flex items-start">
            <span className="text-xs text-muted-foreground w-32 flex-shrink-0">CHEQUEBOOK:</span>
            <span className="text-xs">{nodeInfo.chequebookEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        )}
        {nodeInfo?.swapEnabled !== undefined && (
          <div className="flex items-start">
            <span className="text-xs text-muted-foreground w-32 flex-shrink-0">SWAP:</span>
            <span className="text-xs">{nodeInfo.swapEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        )}
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-scanline"></div>
    </Card>
  );
}
