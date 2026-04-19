import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { USDC_DECIMALS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSDC(raw: bigint): string {
  const n = Number(raw) / 10 ** USDC_DECIMALS;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function parseUSDC(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 10 ** USDC_DECIMALS));
}

export function formatOdds(raw: bigint): string {
  // raw is scaled 1e18
  const pct = Number(raw) / 1e16; // → percentage
  return `${pct.toFixed(1)}%`;
}

export function formatPayout(odds: bigint, betAmount: bigint): string {
  if (odds === BigInt(0)) return "$0.00";
  const payout = (betAmount * BigInt("1000000000000000000")) / odds;
  return formatUSDC(payout);
}

export function timeLeft(resolutionTime: number): string {
  const diff = resolutionTime * 1000 - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
