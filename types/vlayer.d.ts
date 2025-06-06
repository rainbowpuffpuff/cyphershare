// types/vlayer.d.ts

declare module "@vlayer/sdk" {
  // Define types more specifically if you know them, otherwise 'any' is a start.
  export function createVlayerClient(options: {
    url: string;
    token: string;
  }): any;
  export function preverifyEmail(options: {
    mimeEmail: string;
    dnsResolverUrl: string;
    token: string;
  }): Promise<any>;
}

declare module "@vlayer/sdk/config" {
  export function createContext(config: any): any;
  export function getConfig(): any;
}
