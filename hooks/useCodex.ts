/**
 * useCodex.ts - Central file for Codex API functionality
 * 
 * This file contains:
 * 1. Type definitions for Codex API
 * 2. CodexClient class implementation 
 * 3. Singleton management functions
 * 4. React hook for component integration
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

//-----------------------------------------------------------------------------
// TYPE DEFINITIONS
//-----------------------------------------------------------------------------

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

export interface FileMetadata {
  manifest: {
    filename: string;
    mimetype: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

//-----------------------------------------------------------------------------
// CODEX CLIENT IMPLEMENTATION
//-----------------------------------------------------------------------------

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

  /**
   * Test direct upload to Codex node
   * @returns Promise resolving to upload result with CID or error
   */
  public async testDirectUpload(): Promise<{ success: boolean; id?: string; message?: string; error?: string }> {
    try {
      // Create a test file with timestamp to ensure uniqueness
      const timestamp = new Date().toISOString();
      const testContent = `This is a test file created at ${timestamp}`;
      const blob = new Blob([testContent], { type: 'text/plain' });
      const fileName = `test-file-${Date.now()}.txt`;
      
      console.log('Uploading test file directly to Codex API...');
      console.log(`URL: ${this.baseUrl}/v1/data`);
      console.log(`File: ${fileName}`);
      
      // Direct fetch to the API
      const response = await fetch(`${this.baseUrl}/v1/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
        body: blob
      });
      
      console.log('========== DIRECT UPLOAD RESPONSE ==========');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:');
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
      
      // Try to get the response as text first
      const responseText = await response.text();
      console.log('Response Text:', responseText);
      console.log('===========================================');
      
      // Try to parse as JSON if possible
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('Parsed JSON response:', jsonResponse);
        
        // Extract CID
        const cid = jsonResponse.id || jsonResponse.cid || 
          (jsonResponse.data && (jsonResponse.data.id || jsonResponse.data.cid));
        
        if (cid) {
          console.log('%c Direct upload CID: ' + cid, 'background: #222; color: #bada55; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
          return { success: true, id: cid, message: `Direct upload successful. CID: ${cid}` };
        }
        return { success: true, id: 'unknown-id', message: 'Upload successful but no CID found' };
      } catch {
        // If not JSON, the response text might be the CID directly
        if (responseText && response.ok) {
          console.log('%c Direct upload CID (from text): ' + responseText.trim(), 'background: #222; color: #bada55; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
          return { success: true, id: responseText.trim(), message: `Direct upload successful. CID: ${responseText.trim()}` };
        }
        
        // Something went wrong but we got a 200 OK response
        if (response.ok) {
          return { success: true, message: 'Upload successful but response format is unexpected' };
        }
        
        // Error response
        return { success: false, error: `Upload failed with status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('Error in direct upload test:', error);
      return { 
        success: false, 
        error: `Direct upload test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  /**
   * Get file metadata from Codex
   * @param fileId - The Codex file ID (CID)
   * @returns Promise resolving to file metadata
   */
  public async getFileMetadata(fileId: string): Promise<{ success: boolean; metadata?: FileMetadata; error?: string }> {
    try {
      const metadataUrl = `${this.baseUrl}/v1/data/${fileId}/network`;
      console.log(`Fetching metadata from: ${metadataUrl}`);
      
      const metadataResponse = await axios.post(metadataUrl);
      return { success: true, metadata: metadataResponse.data };
    } catch (error) {
      console.error('Error fetching file metadata:', error);
      let errorMessage = 'Failed to fetch file metadata';
      
      if (axios.isAxiosError(error)) {
        errorMessage += `: ${error.response?.status || ''} ${error.message}`;
        console.error('API error details:', error.response?.data);
      } else if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Download a file from Codex
   * @param fileId - The Codex file ID (CID)
   * @returns Promise resolving to file data and metadata
   */
  public async downloadFile(fileId: string): Promise<{ 
    success: boolean; 
    data?: Blob; 
    metadata?: {
      filename: string;
      mimetype: string;
    }; 
    error?: string 
  }> {
    try {
      // Step 1: Get the file metadata
      const metadataResult = await this.getFileMetadata(fileId);
      if (!metadataResult.success || !metadataResult.metadata) {
        return { success: false, error: metadataResult.error || 'Failed to fetch file metadata' };
      }
      
      const { manifest } = metadataResult.metadata;
      const { filename, mimetype } = manifest;
      
      console.log('File metadata:', {
        filename,
        mimetype,
        manifest
      });
      
      // Step 2: Download the file content
      const downloadUrl = `${this.baseUrl}/v1/data/${fileId}/network/stream`;
      console.log(`Downloading file from: ${downloadUrl}`);
      
      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'blob'
      });
      
      return {
        success: true,
        data: fileResponse.data,
        metadata: {
          filename,
          mimetype
        }
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      let errorMessage = 'Failed to download file';
      
      if (axios.isAxiosError(error)) {
        errorMessage += `: ${error.response?.status || ''} ${error.message}`;
        console.error('API error details:', error.response?.data);
      } else if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      return { success: false, error: errorMessage };
    }
  }
}

//-----------------------------------------------------------------------------
// SINGLETON MANAGEMENT
//-----------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------
// REACT HOOK
//-----------------------------------------------------------------------------

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
    testDirectUpload: client.testDirectUpload.bind(client),
    downloadFile: client.downloadFile.bind(client),
  };
} 