export const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";

export const TREASURY_ADDRESS =
  (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";

/**
 * USDC on Arc Testnet — verified from official docs
 * https://docs.arc.network/arc/references/contract-addresses
 *
 * NOTE: This is the native USDC contract. Arc uses USDC as native gas,
 * so this contract provides the optional ERC-20 interface.
 */
export const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) ||
  "0x3600000000000000000000000000000000000000";

export const USDC_DECIMALS = 6;

// Other Arc Testnet contracts (from official Arc docs)
export const ARC_CONTRACTS = {
  USDC:                  "0x3600000000000000000000000000000000000000",
  EURC:                  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  USYC:                  "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  TokenMessengerV2:      "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  MessageTransmitterV2:  "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  Multicall3:            "0xcA11bde05977b3631167028862bE2a173976CA11",
  Permit2:               "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} as const;

export const CATEGORIES = ["All", "Crypto", "Sports", "Politics", "Tech", "Entertainment"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORM_FEE_BPS = 150; // 1.5% platform fee, routed on-chain via Treasury

/**
 * Admin wallet — only this address sees the Admin nav link & can access /admin.
 * Client-side gate (UX); on-chain authority is still enforced by MarketFactory.owner.
 * Baked in as fallback so the gate works even without env wiring.
 */
export const ADMIN_ADDRESS = (
  (process.env.NEXT_PUBLIC_ADMIN_ADDRESS as `0x${string}` | undefined) ||
  "0xE97ca2E70c7a5a745e60DA3b7D793f962cac5E51"
).toLowerCase() as `0x${string}`;

export const MARKET_STATUS = {
  OPEN: "open",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
} as const;
