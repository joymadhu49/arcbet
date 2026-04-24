"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { fallback, http } from "viem";
import { ARC_RPC_URLS, arcTestnet } from "./chains";

/**
 * WalletConnect Cloud project id. Get one at https://cloud.walletconnect.com
 * and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Fallback is a demo id — fine
 * for dev, replace for production.
 */
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "bc3ba3e43e0cf5ad3749cbaf0fb29fb9";

/**
 * Build a fallback transport from our ordered RPC list. viem tries each in
 * order, moves on if one errors, and health-checks them in the background so
 * a temporarily-down endpoint is skipped until it recovers.
 */
const arcTransport = fallback(
  ARC_RPC_URLS.map((url) => http(url, { timeout: 10_000 })),
  { rank: { interval: 60_000, sampleCount: 3 } },
);

export const wagmiConfig = getDefaultConfig({
  appName: "Propex",
  projectId,
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: arcTransport,
  },
  ssr: true,
});
