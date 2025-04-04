/**
 * Codex API client and React hook for interacting with Codex nodes
 * This file contains both the core client implementation and the React hook
 */

import { useState, useEffect, useCallback } from 'react';

// Types for Codex API responses
export interface CodexNodeInfo {
  version: string;
  status: string;
  uptime: string;
  peers?: number;
  [key: string]: unknown; // For any additional fields in the response
}

interface CodexApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Class to handle all Codex-related operations
 */
export class CodexClient {
  private baseUrl: string;
  private isActive: boolean = false;
  private lastChecked: number = 0;
  private checkInterval: number = 30000; // Check every 30 seconds

  constructor(baseUrl: string = "http://localhost:8080/api/codex") {
    this.baseUrl = baseUrl;
  }

  /**
   * Update the base URL for the Codex API
   * @param newUrl - The new base URL for the Codex API
   */
  public updateBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl;
    // Reset active status and force a new check
    this.isActive = false;
    this.lastChecked = 0;
  }

  /**
   * Get the current base URL
   * @returns The current base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check if the Codex node is active
   * @param forceCheck - Force a check even if the cache is still valid
   * @returns Promise resolving to a boolean indicating if the node is active
   */
  public async isNodeActive(forceCheck: boolean = false): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if it's recent enough and not forcing a check
    if (!forceCheck && now - this.lastChecked < this.checkInterval) {
      return this.isActive;
    }
    
    try {
      // Create an AbortController with timeout for browsers that don't support AbortSignal.timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/v1/debug/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      this.isActive = response.ok;
      this.lastChecked = now;
      return this.isActive;
    } catch (error) {
      // Handle network errors (like ECONNREFUSED when node is not running)
      // Don't log to console in production as this is an expected case
      if (process.env.NODE_ENV !== 'production') {
        console.log('Codex node is not reachable:', error instanceof Error ? error.message : String(error));
      }
      this.isActive = false;
      this.lastChecked = now;
      return false;
    }
  }

  /**
   * Get information about the Codex node
   * @returns Promise resolving to node info or null if request fails
   */
  public async getNodeInfo(): Promise<CodexNodeInfo | null> {
    try {
      // Add timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/v1/debug/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as CodexNodeInfo;
    } catch (error) {
      // Don't log to console in production as this is an expected case when node is not running
      if (process.env.NODE_ENV !== 'production') {
        console.log('Could not fetch Codex node info:', error instanceof Error ? error.message : String(error));
      }
      return null;
    }
  }

  /**
   * Generic method to make API requests to the Codex node
   * @param endpoint - API endpoint (without the base URL)
   * @param method - HTTP method
   * @param body - Request body for POST/PUT requests
   * @returns Promise resolving to the API response
   */
  public async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<CodexApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      
      const options: RequestInit = {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      
      // Add timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      options.signal = controller.signal;
      
      try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        // Try to parse JSON, but handle case where response might not be valid JSON
        let data;
        try {
          data = await response.json();
        } catch {
          data = { error: 'Invalid response format' };
        }
        
        return {
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? (data.error || `HTTP error! Status: ${response.status}`) : undefined,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Handle network errors more gracefully
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The Codex node might be unresponsive.',
        };
      }
      
      // For network errors (like when node is not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to Codex node. Please check if it is running.',
        };
      }
      
      // For other errors
      if (process.env.NODE_ENV !== 'production') {
        console.error(`Error making ${method} request to ${endpoint}:`, error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Upload a file to the Codex node
   * @param file - The file to upload
   * @param onProgress - Optional callback for upload progress
   * @returns Promise resolving to the upload response or error
   */
  public async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const url = `${this.baseUrl}/v1/data`;
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              onProgress(percentComplete);
            }
          });
        }
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        
        xhr.onload = function() {
          // Log the raw response text first, before any parsing
          console.log('=== RAW CODEX UPLOAD RESPONSE ===');
          console.log('Status:', xhr.status);
          console.log('Response Text:', xhr.responseText);
          console.log('Response Headers:', xhr.getAllResponseHeaders());
          console.log('===============================');
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // Try to parse as JSON
              let response;
              try {
                response = JSON.parse(xhr.responseText);
                console.log('Parsed JSON response:', response);
              } catch {
                // Response is not JSON, using raw text
                console.log('Response is not JSON, using raw text');
                response = xhr.responseText.trim();
              }
              
              // Extract the CID from the response
              const cid = typeof response === 'object' ? 
                (response.id || response.cid || 
                (response.data && (response.data.id || response.data.cid))) : 
                response;
              
              if (!cid) {
                console.warn('No CID found in Codex upload response:', response);
                // Try to extract CID from raw response if it's just a string
                const rawResponse = xhr.responseText.trim();
                if (rawResponse && !rawResponse.includes('{') && !rawResponse.includes('[')) {
                  console.log('Using raw response as CID:', rawResponse);
                  resolve({ 
                    success: true, 
                    id: rawResponse
                  });
                  return;
                }
              } else {
                console.log('%c File uploaded successfully! CID: ' + cid, 'background: #222; color: #bada55; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
              }
              
              resolve({ 
                success: true, 
                id: cid
              });
            } catch {
              // If response is not JSON but status is success
              console.warn('Failed to parse Codex upload response');
              console.log('Raw response text:', xhr.responseText);
              
              // If the response is a plain string, it might be the CID directly
              const rawText = xhr.responseText.trim();
              resolve({ 
                success: true, 
                id: rawText // Use the raw text as the ID
              });
            }
          } else {
            console.error('Upload failed with status:', xhr.status);
            let errorMessage = 'Upload failed';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
              console.error('Error response:', errorResponse);
            } catch {
              // If error response is not JSON
              errorMessage = `Upload failed with status ${xhr.status}: ${xhr.responseText}`;
              console.error('Error response (not JSON):', xhr.responseText);
            }
            resolve({ success: false, error: errorMessage });
          }
        };

        xhr.onerror = function() {
          console.error('Network error during upload');
          resolve({ success: false, error: 'Network error occurred during upload' });
        };

        xhr.send(file);
      });
    } catch (error) {
      // Handle network errors more gracefully
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The Codex node might be unresponsive.',
        };
      }
      
      // For network errors (like when node is not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to Codex node. Please check if it is running.',
        };
      }
      
      // For other errors
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error uploading file:', error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Create a singleton instance for use throughout the app
let codexClientInstance: CodexClient | null = null;

/**
 * Get the CodexClient instance (creates one if it doesn't exist)
 * @param baseUrl - Optional base URL to initialize or update the client
 * @returns The CodexClient instance
 */
export function getCodexClient(baseUrl?: string): CodexClient {
  if (!codexClientInstance) {
    codexClientInstance = new CodexClient(baseUrl);
  } else if (baseUrl) {
    codexClientInstance.updateBaseUrl(baseUrl);
  }
  
  return codexClientInstance;
}

/**
 * Reset the CodexClient instance (useful for testing)
 */
export function resetCodexClient(): void {
  codexClientInstance = null;
}

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
    getCodexClient: () => getCodexClient(),
  };
} 