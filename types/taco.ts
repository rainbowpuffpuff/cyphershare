export type ConditionKind = "positive" | "time" | "nft";

export type ConditionArgs = {
  positive: undefined;
  time: { windowTimeInSeconds?: number };
  nft: { nftContractAddress: string; minimumBalance: number; chainId: number; networkName: string };
};
