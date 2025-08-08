/**
 * useSwarm.ts - Central file for Swarm Bee API functionality
 *
 * This file contains:
 * 1. Type definitions for Swarm API
 * 2. SwarmClient class implementation
 * 3. Singleton management functions
 * 4. React hook for component integration
 */

import { useState, useEffect, useCallback } from "react";
import { Bee, BeeDev, UploadResult } from "@ethersphere/bee-js";

//-----------------------------------------------------------------------------
// TYPE DEFINITIONS
//-----------------------------------------------------------------------------

export interface SwarmNodeInfo {
  version: string;
  beeMode: string;
  chequebookEnabled: boolean;
  swapEnabled: boolean;
}

export type SwarmEndpointType = "remote" | "local";

//-----------------------------------------------------------------------------
// SWARM CLIENT IMPLEMENTATION
//-----------------------------------------------------------------------------

/**
 * Class to handle all Swarm-related operations
 */
export class SwarmClient {
  private bee: Bee | null = null;
  private beeDebug: BeeDev | null = null;
  private baseUrl: string;
  private isActive: boolean = false;
  private lastChecked: number = 0;
  private checkInterval: number = 30000; // Check every 30 seconds
  private endpointType: SwarmEndpointType;
  public postageBatchId: string | null = null;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_SWARM_LOCAL_API_URL || "http://localhost:1633",
    endpointType: SwarmEndpointType = "local",
    postageBatchId: string | null = null
  ) {
    this.baseUrl = baseUrl;
    this.endpointType = endpointType;
    this.postageBatchId = postageBatchId;
    this.initializeBee();
    console.log("=== SWARM CLIENT CONFIGURATION ===");
    console.log("Endpoint Type:", endpointType);
    console.log("Base URL:", baseUrl);
    console.log("Postage Batch ID:", postageBatchId || "not set");
    console.log("================================");
  }

  private initializeBee(): void {
    try {
      if (!this.baseUrl) {
        console.error("Swarm API URL is not set.");
        this.bee = null;
        this.beeDebug = null;
        return;
      }
      this.bee = new Bee(this.baseUrl);
      this.beeDebug = new BeeDev(this.baseUrl);
    } catch (error) {
      console.error("Error initializing Bee client:", error);
      this.bee = null;
      this.beeDebug = null;
    }
  }

  /**
   * Update the configuration for the Swarm API
   */
  public updateConfig(newUrl: string, endpointType: SwarmEndpointType, newPostageBatchId: string | null): void {
    console.log("=== UPDATING SWARM CONFIGURATION ===");
    this.baseUrl = newUrl;
    this.endpointType = endpointType;
    this.postageBatchId = newPostageBatchId;
    this.initializeBee();
    this.isActive = false;
    this.lastChecked = 0;
    console.log("Configuration updated successfully");
    console.log("=================================");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getEndpointType(): SwarmEndpointType {
    return this.endpointType;
  }

  public async isNodeActive(forceCheck: boolean = false): Promise<boolean> {
    const now = Date.now();
    if (!forceCheck && now - this.lastChecked < this.checkInterval) {
      return this.isActive;
    }

    if (!this.bee) {
      this.isActive = false;
      return false;
    }

    try {
      const health = await this.bee.getHealth();
      this.isActive = health.status === 'ok';
      this.lastChecked = now;
      return this.isActive;
    } catch (error) {
      console.error("Error checking Swarm node status:", error);
      this.isActive = false;
      this.lastChecked = now;
      return false;
    }
  }

  public async getNodeInfo(): Promise<SwarmNodeInfo | null> {
    if (!this.bee || !this.beeDebug) return null;
    try {
      const [nodeInfo, health] = await Promise.all([
        this.beeDebug.getNodeInfo(),
        this.bee.getHealth(),
      ]);

      return {
        version: health.version,
        beeMode: nodeInfo.beeMode,
        chequebookEnabled: nodeInfo.chequebookEnabled,
        swapEnabled: nodeInfo.swapEnabled,
      };
    } catch (error) {
      console.error("Could not fetch Swarm node info:", error);
      return null;
    }
  }

  public async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.bee) {
      return { success: false, error: "Swarm client not initialized." };
    }
    if (!this.postageBatchId) {
      return { success: false, error: "Postage Batch ID is not configured." };
    }

    try {
      // bee-js doesn't have a direct progress callback in the same way as XHR
      // We can call onProgress at the start and end.
      onProgress?.(0);
      const result: UploadResult = await this.bee.uploadFile(this.postageBatchId, file);
      onProgress?.(100);

      return {
        success: true,
        id: result.reference.toString(),
      };
    } catch (error) {
      onProgress?.(100); // Ensure progress is marked as complete even on error
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error uploading file to Swarm:", message);
      return {
        success: false,
        error: message,
      };
    }
  }

  public async downloadFile(fileId: string): Promise<{
    success: boolean;
    data?: Blob;
    metadata?: { filename: string; mimetype: string };
    error?: string;
  }> {
    if (!this.bee) {
      return { success: false, error: "Swarm client not initialized." };
    }

    try {
      const fileData = await this.bee.downloadFile(fileId);
      const blob = new Blob([fileData.data.toUint8Array()]);

      return {
        success: true,
        data: blob,
        metadata: {
          filename: fileData.name || 'file',
          mimetype: fileData.contentType || 'application/octet-stream',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error downloading file from Swarm:", message);
      return {
        success: false,
        error: message,
      };
    }
  }
}

//-----------------------------------------------------------------------------
// SINGLETON MANAGEMENT
//-----------------------------------------------------------------------------

let swarmClientInstance: SwarmClient | null = null;

export function getSwarmClient(
  baseUrl?: string,
  endpointType?: SwarmEndpointType,
  postageBatchId?: string | null,
): SwarmClient {
  if (!swarmClientInstance) {
    swarmClientInstance = new SwarmClient(baseUrl, endpointType, postageBatchId);
  } else if (baseUrl !== undefined && endpointType !== undefined && postageBatchId !== undefined) {
    swarmClientInstance.updateConfig(baseUrl, endpointType, postageBatchId);
  }
  return swarmClientInstance;
}

//-----------------------------------------------------------------------------
// REACT HOOK
//-----------------------------------------------------------------------------

export function useSwarm(
  initialUrl?: string,
  initialEndpointType?: SwarmEndpointType,
  initialPostageBatchId?: string | null,
) {
  const [client] = useState<SwarmClient>(() =>
    getSwarmClient(initialUrl, initialEndpointType, initialPostageBatchId)
  );
  const [isNodeActive, setIsNodeActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointType, setEndpointType] = useState<SwarmEndpointType>(
    client.getEndpointType()
  );
  const [postageBatchId, setPostageBatchId] = useState<string | null>(
      client.postageBatchId
  );

  const checkNodeStatus = useCallback(
    async (forceCheck: boolean = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      let isActive = false;
      try {
        isActive = await client.isNodeActive(forceCheck);
        setIsNodeActive(isActive);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check node status"
        );
        setIsNodeActive(false);
      } finally {
        setIsLoading(false);
      }
      return isActive;
    },
    [client]
  );

  const updateConfig = useCallback(
    (newUrl: string, newEndpointType: SwarmEndpointType, newPostageBatchId: string | null): void => {
      try {
        if (!newUrl.startsWith("http")) {
          throw new Error("URL must start with 'http://' or 'https://'");
        }
        client.updateConfig(newUrl, newEndpointType, newPostageBatchId);
        setEndpointType(newEndpointType);
        setPostageBatchId(newPostageBatchId);
        checkNodeStatus(true);
      } catch (err) {
        setError(
          `Invalid URL or config: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    },
    [client, checkNodeStatus]
  );

  useEffect(() => {
    checkNodeStatus();
    const intervalId = setInterval(() => {
      checkNodeStatus();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [checkNodeStatus]);

  return {
    client,
    isNodeActive,
    isLoading,
    error,
    endpointType,
    postageBatchId,
    checkNodeStatus,
    updateConfig,
    baseUrl: client.getBaseUrl(),
    getNodeInfo: client.getNodeInfo.bind(client),
    uploadFile: client.uploadFile.bind(client),
    downloadFile: client.downloadFile.bind(client),
  };
}
