import { defineChain } from "viem";

/**
 * Arc Testnet — Circle's L1 chain.
 * IMPORTANT: Native gas token is USDC, not ETH.
 * Source: https://docs.arc.network/arc/references/connect-to-arc
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6,                  // USDC has 6 decimals
    name: "USD Coin",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [arcTestnet] as const;
