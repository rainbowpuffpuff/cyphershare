/**
 * Codex API client for interacting with Codex nodes
 * Handles API requests, node status checking, and configuration
 */

// Types for Codex API responses
interface CodexNodeInfo {
  version: string;
  status: string;
  uptime: string;
  peers?: number;
  [key: string]: any; // For any additional fields in the response
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
    body?: any
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      options.signal = controller.signal;
      
      try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        // Try to parse JSON, but handle case where response might not be valid JSON
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          data = { error: 'Invalid response format' };
        }
        
        return {
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? (data.error || `HTTP error! Status: ${response.status}`) : undefined,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError; // Re-throw to be caught by outer try-catch
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
        console.log(`Error making ${method} request to ${endpoint}:`, error);
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