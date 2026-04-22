"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";

/**
 * WalletConnect Cloud project id.
 *
 * RainbowKit + WalletConnect require a project id. Get a free one at
 *   https://cloud.walletconnect.com
 * and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local.
 *
 * The fallback below is a well-known public demo id — fine for local dev,
 * but you should ship with your own id in production.
 */
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "bc3ba3e43e0cf5ad3749cbaf0fb29fb9";

export const wagmiConfig = getDefaultConfig({
  appName: "Propex",
  projectId,
  chains: [arcTestnet],
  ssr: true,
});
