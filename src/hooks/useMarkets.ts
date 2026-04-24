"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ADDRESS } from "@/lib/constants";
import { MARKET_FACTORY_ABI, PREDICTION_MARKET_ABI } from "@/lib/abi";
import { MarketData, Outcome } from "@/types";

type RawMarket = {
  question: string;
  description: string;
  category: string;
  imageUrl: string;
  resolutionTime: bigint;
  seedLiquidity: bigint;
  outcome: number;
  resolved: boolean;
};

const OUTCOME_MAP: Record<number, Outcome> = {
  0: "UNRESOLVED",
  1: "YES",
  2: "NO",
  3: "CANCELLED",
};

export function useAllMarketAddresses() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getAllMarkets",
    // Refetch periodically so newly-created markets show up without a full page reload.
    query: {
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
}

export function useMarketData(address: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { address, abi: PREDICTION_MARKET_ABI, functionName: "getMarket" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "yesOdds" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "noOdds" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "totalPool" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "yesReserve" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "noReserve" },
    ],
    query: {
      // Refresh on tab focus so positions update after a round-trip through
      // the market page (buy/sell) without a manual reload.
      refetchOnWindowFocus: true,
      refetchInterval: false,
    },
  });

  const raw = data?.[0]?.result as RawMarket | undefined;
  const yesReserve = data?.[4]?.result as bigint | undefined;
  const noReserve  = data?.[5]?.result as bigint | undefined;

  const market: MarketData | undefined = raw
    ? {
        address,
        question:       raw.question,
        description:    raw.description,
        category:       raw.category,
        imageUrl:       raw.imageUrl,
        resolutionTime: Number(raw.resolutionTime),
        seedLiquidity:  raw.seedLiquidity,
        yesReserve:     yesReserve ?? 0n,
        noReserve:      noReserve  ?? 0n,
        outcome:        OUTCOME_MAP[raw.outcome] ?? "UNRESOLVED",
        resolved:       raw.resolved,
      }
    : undefined;

  return {
    market,
    yesOdds:    data?.[1]?.result as bigint | undefined,
    noOdds:     data?.[2]?.result as bigint | undefined,
    totalPool:  data?.[3]?.result as bigint | undefined,
    yesReserve,
    noReserve,
    isLoading,
    error,
    refetch,
  };
}

export function useUserShares(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getUserShares",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      // Portfolio correctness matters more than RPC chatter here — if you just
      // bought on another page, tabbing back should show the position.
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 5_000,
    },
  });
}

export function usePreviewPayout(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewPayout",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 5_000,
    },
  });
}

export function usePreviewBuy(
  marketAddress: `0x${string}`,
  isYes: boolean,
  amountIn: bigint | undefined,
) {
  return useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewBuy",
    args: amountIn ? [isYes, amountIn] : undefined,
    query: { enabled: amountIn !== undefined && amountIn > 0n },
  });
}

export function usePreviewSell(
  marketAddress: `0x${string}`,
  isYes: boolean,
  sharesIn: bigint | undefined,
) {
  return useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewSell",
    args: sharesIn ? [isYes, sharesIn] : undefined,
    query: { enabled: sharesIn !== undefined && sharesIn > 0n },
  });
}
