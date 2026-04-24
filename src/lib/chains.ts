import { defineChain } from "viem";

/**
 * Ordered Arc Testnet HTTP RPC endpoints. The first is tried first; if it
 * errors or times out, viem's `fallback()` transport (wired up in
 * wagmi-config.ts) moves to the next. Sources:
 *   - https://docs.arc.network/arc/references/connect-to-arc    (official)
 *   - https://chainlist.org/chain/5042002                       (drpc public)
 *
 * Override with NEXT_PUBLIC_ARC_RPC (single URL) or NEXT_PUBLIC_ARC_RPCS
 * (comma-separated list, highest priority first).
 */
export const ARC_RPC_URLS: readonly string[] = (() => {
  const many = process.env.NEXT_PUBLIC_ARC_RPCS;
  if (many) {
    const list = many.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  const single = process.env.NEXT_PUBLIC_ARC_RPC;
  // Defaults: try drpc first (higher score per chainlist.org), official second.
  return [
    ...(single ? [single] : []),
    "https://arc-testnet.drpc.org",
    "https://rpc.testnet.arc.network",
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe
})();

/**
 * Arc Testnet — Circle's L1 chain.
 * IMPORTANT: Native gas token is USDC, not ETH.
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6, // USDC has 6 decimals
    name: "USD Coin",
    symbol: "USDC",
  },
  rpcUrls: {
    default: { http: ARC_RPC_URLS },
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
