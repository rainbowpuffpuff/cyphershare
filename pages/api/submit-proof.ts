// pages/api/submit-proof.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createVlayerClient, preverifyEmail } from "@vlayer/sdk";
import prover_abi from "../../prover_abi.json";

// Define the structure of the chain object based on SDK usage
interface Chain {
  id: number;
  name: string;
  // Add other properties if they are needed by the SDK
}

// Manually define chain configurations
const chains: Record<string, Chain> = {
  optimismSepolia: { id: 11155420, name: "optimismSepolia" },
  // Add other chains here if needed
};

type ResponseData = {
  message: string;
  result?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { emlContent, scriptContent, secret, walletAddress } = req.body;

    if (!emlContent || !scriptContent || !secret || !walletAddress) {
      return res
        .status(400)
        .json({ message: "Bad Request: Missing required parameters." });
    }

    // --- START OF FINAL FIX ---

    // 1. Directly read variables from process.env (server-side)
    const chainName = process.env.CHAIN_NAME;
    const proverUrl = process.env.PROVER_URL;
    const token = process.env.VLAYER_API_TOKEN;

    // 2. Validate them
    if (!chainName || !proverUrl || !token) {
      throw new Error(
        "Server is missing required environment variables (CHAIN_NAME, PROVER_URL, VLAYER_API_TOKEN)."
      );
    }

    // 3. Manually construct the necessary config objects
    const chain = chains[chainName];
    if (!chain) {
      throw new Error(
        `Unsupported chain name in environment variables: ${chainName}`
      );
    }
    const gasLimit = 20000000; // A reasonable default, or load from env if needed

    // --- END OF FINAL FIX ---

    const vlayer = createVlayerClient({ url: proverUrl, token });

    const hash = await vlayer.prove({
      address: walletAddress,
      proverAbi: prover_abi as any[],
      functionName: "main",
      chainId: chain.id,
      gasLimit: gasLimit,
      args: [
        await preverifyEmail({
          mimeEmail: emlContent,
          // The dnsResolverUrl is not strictly required by the SDK if it has other means,
          // but providing a public one is a robust fallback.
          dnsResolverUrl: "https://dns.google/resolve",
          token: token,
        }),
        scriptContent,
        secret,
      ],
    });

    const result = await vlayer.waitForProvingResult({ hash });

    if (result) {
      res
        .status(200)
        .json({ message: "Proof submitted successfully!", result });
    } else {
      throw new Error("Proof submission failed or returned no result.");
    }
  } catch (error) {
    console.error("Error in /api/submit-proof:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}
