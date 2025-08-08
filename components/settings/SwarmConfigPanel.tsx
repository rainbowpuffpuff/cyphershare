// components/settings/SwarmConfigPanel.tsx
import { useState, useEffect } from "react";
import { Server, Info, AlertCircle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSwarmContext } from "@/context/SwarmContext";
import { SwarmNodeInfo } from "@/hooks/useSwarm";

export default function SwarmConfigPanel() {
  const {
    swarmNodeUrl,
    swarmPostageBatchId,
    updateSettings,
  } = useSettings();

  const {
    isSwarmNodeActive,
    isSwarmLoading,
    swarmError,
    getNodeInfo,
    checkSwarmStatus,
    updateSwarmConfig,
  } = useSwarmContext();

  const [localSwarmUrl, setLocalSwarmUrl] = useState(swarmNodeUrl);
  const [localPostageBatchId, setLocalPostageBatchId] = useState(swarmPostageBatchId);
  const [nodeInfo, setNodeInfo] = useState<SwarmNodeInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isSwarmNodeActive) {
      getNodeInfo().then(setNodeInfo);
    } else {
      setNodeInfo(null);
    }
  }, [isSwarmNodeActive, getNodeInfo]);

  const handleSave = () => {
    if (!localSwarmUrl.startsWith("http")) {
      alert("Please enter a valid URL starting with http:// or https://");
      return;
    }
    if (!localPostageBatchId) {
        alert("Please enter a valid Postage Batch ID");
        return;
    }

    setIsSaving(true);
    updateSettings({ swarmNodeUrl: localSwarmUrl, swarmPostageBatchId: localPostageBatchId });
    // The context gets settings, so we just need to trigger a settings update.
    // The SwarmProvider will pick up the new settings and re-initialize the client.
    // However, for immediate feedback, we can call updateSwarmConfig directly.
    updateSwarmConfig(localSwarmUrl, 'local', localPostageBatchId);


    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const handleRefresh = () => {
      checkSwarmStatus(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Server size={16} className="text-primary" />
          </div>
          <h3 className="text-base font-medium font-mono">SWARM_SETTINGS</h3>
        </div>
        {isSwarmLoading ? (
          <div
            className="w-2 h-2 rounded-full bg-amber-700/70 animate-pulse"
            title="Checking node status..."
          />
        ) : isSwarmNodeActive ? (
          <div
            className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
            title="Node is active"
          />
        ) : (
          <div
            className="w-2 h-2 rounded-full bg-amber-600/80"
            title="Node is not active"
          />
        )}
      </div>

      <div className="space-y-4 pl-2 ml-2 border-l border-border">
        <div className="space-y-2">
          <label htmlFor="swarm-url" className="text-sm font-medium font-mono">
            API_ENDPOINT
          </label>
          <Input
            id="swarm-url"
            value={localSwarmUrl}
            onChange={(e) => setLocalSwarmUrl(e.target.value)}
            placeholder="http://localhost:1633"
            className="font-mono text-sm bg-card/70"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="postage-batch-id" className="text-sm font-medium font-mono">
            POSTAGE_BATCH_ID
          </label>
          <Input
            id="postage-batch-id"
            value={localPostageBatchId}
            onChange={(e) => setLocalPostageBatchId(e.target.value)}
            placeholder="Enter your postage batch ID"
            className="font-mono text-sm bg-card/70"
          />
        </div>

        <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">
              Swarm node connection details
            </p>
            <div className="flex items-center gap-1">
              {isSwarmNodeActive ? (
                <span className="text-xs text-green-500 font-mono flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  ACTIVE
                </span>
              ) : (
                <span className="text-xs text-amber-600/90 font-mono flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600/80" />
                  {isSwarmLoading ? "CHECKING" : "OFFLINE"}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-6 w-6 p-0 rounded-full"
                title="Refresh node status"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-refresh-cw"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </Button>
            </div>
          </div>

        {swarmError && (
          <p className="text-xs text-amber-600/90 font-mono mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> Error: {swarmError}
          </p>
        )}

        {isSwarmNodeActive && nodeInfo && (
          <div className="mt-3 p-2 bg-card/50 border border-primary/10 rounded-md">
            <div className="flex items-center gap-1 mb-1">
              <Info size={12} className="text-primary/70" />
              <span className="text-xs font-medium text-primary/90 font-mono">NODE_INFO</span>
            </div>
            <div className="space-y-1 pl-4 border-l border-primary/10">
              <p className="text-xs font-mono flex items-center justify-between">
                <span className="text-muted-foreground">VERSION:</span>
                <span className="text-primary/80">{nodeInfo.version}</span>
              </p>
              <p className="text-xs font-mono flex items-center justify-between">
                <span className="text-muted-foreground">MODE:</span>
                <span className="text-primary/80">{nodeInfo.beeMode}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button className="flex-1 font-mono" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "SAVING..." : saveSuccess ? "SAVED!" : "SAVE_CONFIG"}
        </Button>
      </div>
    </div>
  );
}
