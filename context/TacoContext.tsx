// context/TacoContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { useWallet } from "./WalletContext";
import useTaco from "@/hooks/useTaco";
import { domains, conditions } from "@nucypher/taco";
import { ethers } from "ethers";

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------
interface TacoContextType {
  // Initialization status
  isTacoInit: boolean;
  networkError: string | null;
  
  // Core encryption/decryption functions
  encryptDataToBytes: (
    data: string | Uint8Array,
    condition: conditions.condition.Condition,
    encryptorSigner: ethers.Signer
  ) => Promise<Uint8Array | undefined>;
  
  decryptDataFromBytes: (
    encryptedBytes: Uint8Array,
    signer: ethers.Signer
  ) => Promise<Uint8Array>;
  
  
  // Encryption settings
  useEncryption: boolean;
  setUseEncryption: (val: boolean) => void;
  accessConditionType: "positive" | "time";
  setAccessConditionType: (val: "positive" | "time") => void;
  windowTimeSeconds: string;
  setWindowTimeSeconds: (val: string) => void;
  
  // Configuration
  ritualId: number;
  domain: string;
  
  /**
   * Returns an access condition object **and** a user-friendly description
   * based on the selected accessConditionType plus optional parameters.
   * Useful for UI tool-tips and sharing with peers.
   */
  createCondition: (
    type: "positive" | "time",
    params?: {
      windowTimeInSeconds?: number
    }
  ) => Promise<{
    condition: conditions.condition.Condition;
    description: string;
  }>;
}

const TacoContext = createContext<TacoContextType | null>(null);

export const useTacoContext = () => {
  const ctx = useContext(TacoContext);
  if (!ctx) throw new Error("useTacoContext must be used within <TacoProvider>");
  return ctx;
};

//-----------------------------------------------------------------------------
// Provider implementation
//-----------------------------------------------------------------------------
interface Props {
  children: ReactNode;
}

export function TacoProvider({ children }: Props) {
  const {
    provider,
    walletConnected,
  } = useWallet();

  // TACo initialization settings
  const ritualId = 6;
  const domain = domains.TESTNET;
  
  // Encryption settings
  const [useEncryption, setUseEncryption] = useState(false);
  const [accessConditionType, setAccessConditionType] = useState<"positive" | "time">("positive");
  const [windowTimeSeconds, setWindowTimeSeconds] = useState("60");

  // TACo hook
  const {
    isInit: isTacoInit,
    networkError,
    encryptDataToBytes,
    decryptDataFromBytes,
    createConditions,
  } = useTaco({
    provider: provider as ethers.providers.Provider | undefined,
    domain,
    ritualId,
  });

  // Helper to create a positive balance condition
  const createPositiveBalanceCondition = useCallback(() => {
    if (networkError) throw new Error(networkError);
    return createConditions.positiveBalance();
  }, [createConditions, networkError]);

  // Helper to create a time window condition
  const createTimeWindowCondition = useCallback(
    async (timeWindowInSeconds: number) => {
      if (networkError) throw new Error(networkError);
      return await createConditions.withinNumberOfSeconds(timeWindowInSeconds);
    },
    [createConditions, networkError]
  );

  // Descriptor helper (central place for generating human-readable descriptions)
  const createCondition = useCallback(
    async (type: "positive" | "time", params?: { windowTimeInSeconds?: number }) => {
      if (type === "positive") {
        const condition = createPositiveBalanceCondition();
        const description =
          "The account needs to have a positive balance to decrypt this file";
        return { condition, description, type } as const;
      }

      if (type === "time") {
        const sec = params?.windowTimeInSeconds || 60;
        const condition = await createTimeWindowCondition(sec);
        const description = `Accessible only within ${sec} seconds of ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})`;
        return { condition, description, type } as const;
      }

      throw new Error("Invalid access condition type");
    },
    [createPositiveBalanceCondition, createTimeWindowCondition]
  );

  // Log initialization status for debugging
  useEffect(() => {
    console.log("TACo initialization status:", {
      isTacoInit,
      networkError,
      walletConnected,
    });
  }, [isTacoInit, networkError, walletConnected]);

  // Context value
  const contextValue: TacoContextType = {
    isTacoInit,
    networkError,
    encryptDataToBytes,
    decryptDataFromBytes,
    useEncryption,
    setUseEncryption,
    accessConditionType,
    setAccessConditionType,
    windowTimeSeconds,
    setWindowTimeSeconds,
    ritualId,
    domain: domain.toString(),
    createCondition,
  };

  return (
    <TacoContext.Provider value={contextValue}>{children}</TacoContext.Provider>
  );
}
