/**
 * CoinGecko public API — no key required for the /simple/price endpoint.
 * Docs: https://docs.coingecko.com/reference/simple-price
 */

export const TRACKED_COINS = [
  { id: "bitcoin",      symbol: "BTC", name: "Bitcoin",  emoji: "₿",  color: "#f7931a" },
  { id: "ethereum",     symbol: "ETH", name: "Ethereum", emoji: "Ξ",  color: "#627eea" },
  { id: "solana",       symbol: "SOL", name: "Solana",   emoji: "◎",  color: "#14f195" },
  { id: "ripple",       symbol: "XRP", name: "XRP",      emoji: "✕",  color: "#23292f" },
  { id: "binancecoin",  symbol: "BNB", name: "BNB",      emoji: "⬡",  color: "#f3ba2f" },
] as const;

export type CoinId = (typeof TRACKED_COINS)[number]["id"];
export type CoinMeta = (typeof TRACKED_COINS)[number];

export const COIN_BY_ID: Record<CoinId, CoinMeta> = TRACKED_COINS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<CoinId, CoinMeta>,
);

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

export interface PriceMap {
  [coinId: string]: { usd: number; last_updated_at?: number };
}

/**
 * Fetch USD prices for all tracked coins. Safe to call from the browser —
 * the endpoint supports CORS and requires no auth.
 */
export async function fetchPrices(): Promise<PriceMap> {
  const ids = TRACKED_COINS.map((c) => c.id).join(",");
  const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache:   "no-store",
  });
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

/** Format a USD price with thousands separators and sensible decimals. */
export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}
