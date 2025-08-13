import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SwarmProvider } from "@/context/SwarmContext";
import { FileTransferProvider } from "@/context/FileTransferContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <SettingsProvider>
        <WalletProvider>
          <SwarmProvider>
            <FileTransferProvider>
              <Component {...pageProps} />
              <Toaster richColors position="top-center" />
            </FileTransferProvider>
          </SwarmProvider>
        </WalletProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
