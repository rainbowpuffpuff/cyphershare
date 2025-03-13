import { useState, useEffect, useCallback } from 'react';
import { getCodexClient, CodexClient } from '@/lib/codex';

/**
 * React hook for using the Codex client in components
 * @param initialUrl - Initial URL for the Codex API
 * @returns Object with Codex client, node status, and update functions
 */
export function useCodex(initialUrl?: string) {
  const [client] = useState<CodexClient>(() => getCodexClient(initialUrl));
  const [isNodeActive, setIsNodeActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check node status
  const checkNodeStatus = useCallback(async (forceCheck: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isActive = await client.isNodeActive(forceCheck);
      setIsNodeActive(isActive);
      // Clear any previous errors if the check was successful
      setError(null);
    } catch (err) {
      // This should rarely happen since isNodeActive handles errors internally
      setError(err instanceof Error ? err.message : 'Failed to check node status');
      setIsNodeActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Update the base URL
  const updateBaseUrl = useCallback((newUrl: string) => {
    try {
      // Basic URL validation
      new URL(newUrl); // Will throw if URL is invalid
      client.updateBaseUrl(newUrl);
      checkNodeStatus(true);
    } catch (err) {
      setError(`Invalid URL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [client, checkNodeStatus]);

  // Initial check on mount and periodic checks
  useEffect(() => {
    checkNodeStatus();
    
    // Set up periodic checks
    const intervalId = setInterval(() => {
      checkNodeStatus();
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [checkNodeStatus]);

  return {
    client,
    isNodeActive,
    isLoading,
    error,
    checkNodeStatus,
    updateBaseUrl,
    baseUrl: client.getBaseUrl(),
    getNodeInfo: client.getNodeInfo.bind(client),
  };
} 