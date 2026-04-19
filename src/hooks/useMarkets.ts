"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ADDRESS } from "@/lib/constants";
import { MARKET_FACTORY_ABI, PREDICTION_MARKET_ABI } from "@/lib/abi";
import { MarketData, Outcome } from "@/types";

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
  });
}

export function useMarketData(address: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { address, abi: PREDICTION_MARKET_ABI, functionName: "getMarket" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "yesOdds" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "noOdds" },
      { address, abi: PREDICTION_MARKET_ABI, functionName: "totalPool" },
    ],
    query: {
      refetchInterval: false, // Disable polling to reduce RPC calls and lag
    },
  });

  const raw = data?.[0]?.result as any;
  const market: MarketData | undefined = raw
    ? {
        address,
        question:       raw.question,
        description:    raw.description,
        category:       raw.category,
        imageUrl:       raw.imageUrl,
        resolutionTime: Number(raw.resolutionTime),
        totalYes:       raw.totalYes,
        totalNo:        raw.totalNo,
        outcome:        OUTCOME_MAP[raw.outcome] ?? "UNRESOLVED",
        resolved:       raw.resolved,
      }
    : undefined;

  return {
    market,
    yesOdds:   data?.[1]?.result as bigint | undefined,
    noOdds:    data?.[2]?.result as bigint | undefined,
    totalPool: data?.[3]?.result as bigint | undefined,
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
    query: { enabled: !!userAddress },
  });
}

export function usePreviewPayout(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "previewPayout",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
}
