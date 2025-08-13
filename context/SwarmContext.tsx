// /context/SwarmContext.tsx
// Handles Swarm file storage functionality
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useSwarm, SwarmEndpointType, SwarmNodeInfo, SwarmClient } from "@/hooks/useSwarm";
import { useSettings } from "./SettingsContext";
import { toast } from "sonner";

// Response types for better type safety
interface UploadResponse {
  success: boolean;
  id?: string;
  error?: string;
}

interface DownloadResponse {
  success: boolean;
  data?: Blob;
  error?: string;
}

interface SwarmContextType {
  // Status
  isSwarmNodeActive: boolean;
  isSwarmLoading: boolean;
  swarmError: string | null;

  // Actions
  updateSwarmConfig: (url: string, endpointType: SwarmEndpointType, postageBatchId: string | null) => void;
  checkSwarmStatus: (forceCheck?: boolean) => Promise<boolean>;
  getNodeInfo: () => Promise<SwarmNodeInfo | null>;

  // File operations
  uploadFile: (file: File, onProgress?: (progress: number) => void) => Promise<UploadResponse>;
  downloadFile: (fileId: string) => Promise<DownloadResponse>;
}

const SwarmContext = createContext<SwarmContextType | null>(null);

export const useSwarmContext = () => {
  const ctx = useContext(SwarmContext);
  if (!ctx) throw new Error("useSwarmContext must be used within <SwarmProvider>");
  return ctx;
};

interface SwarmProviderProps {
  children: ReactNode;
}

export function SwarmProvider({ children }: SwarmProviderProps) {
  const { swarmNodeUrl, swarmEndpointType, swarmPostageBatchId } = useSettings();

  // Swarm hook
  const {
    isNodeActive: isSwarmNodeActive,
    isLoading: isSwarmLoading,
    updateConfig: updateSwarmConfig,
    checkNodeStatus: checkSwarmStatus,
    error: swarmError,
    getNodeInfo,
    uploadFile: swarmUploadFile,
    downloadFile: swarmDownloadFile,
  } = useSwarm(swarmNodeUrl, swarmEndpointType, swarmPostageBatchId);

  // Type-safe wrapper for uploadFile to ensure File type
  const uploadFile = async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
    try {
      return await swarmUploadFile(file, onProgress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown upload error";
      console.error("Swarm upload error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Type-safe wrapper for downloadFile
  const downloadFile = async (fileId: string): Promise<DownloadResponse> => {
    try {
      const result = await swarmDownloadFile(fileId);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown download error";
      console.error("Swarm download error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value: SwarmContextType = {
    isSwarmNodeActive,
    isSwarmLoading,
    swarmError,
    updateSwarmConfig,
    checkSwarmStatus,
    getNodeInfo,
    uploadFile,
    downloadFile,
  };

  return <SwarmContext.Provider value={value}>{children}</SwarmContext.Provider>;
}
