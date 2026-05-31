"use client";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useAllMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { TRACKED_COINS, formatUsd, type PriceMap, type CoinId } from "@/lib/coingecko";
import { usePrices } from "@/components/PriceProvider";
import { MarketData } from "@/types";

interface TickEntry {
  address: `0x${string}`;
  market: MarketData;
  yesOdds?: bigint;
  totalPool?: bigint;
}

function TickerLoader({
  address,
  onLoad,
}: {
  address: `0x${string}`;
  onLoad: (addr: `0x${string}`, entry: TickEntry | null) => void;
}) {
  const { market, yesOdds, totalPool, isLoading } = useMarketData(address);
  const fp = market
    ? [market.question, (yesOdds ?? 0n).toString(), (totalPool ?? 0n).toString()].join("|")
    : "";
  useEffect(() => {
    if (isLoading) return;
    onLoad(address, market ? { address, market, yesOdds, totalPool } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, fp, address]);
  return null;
}

function TickerRow({ items, prices }: { items: TickEntry[]; prices: PriceMap | null }) {
  const nodes: React.ReactNode[] = [];

  // Market-based ticks (up to 6 by totalPool) — exclude resolved/cancelled
  const topMarkets = [...items]
    .filter((e) => !e.market.resolved)
    .sort((a, b) => Number((b.totalPool ?? 0n) - (a.totalPool ?? 0n)))
    .slice(0, 6);

  for (const e of topMarkets) {
    const yPct = e.yesOdds ? Number(e.yesOdds) / 1e16 : 50;
    // short key from question
    const key = e.market.question.length > 22
      ? e.market.question.slice(0, 22).toUpperCase() + "…"
      : e.market.question.toUpperCase();
    // Derive a tiny delta from pool vs yes odds for visual movement — cheap proxy.
    const delta = ((yPct - 50) / 10).toFixed(1);
    const up = Number(delta) >= 0;
    nodes.push(
      <div key={`m-${e.address}`} className="mono flex items-center gap-2 text-[11px] whitespace-nowrap">
        <span className="tracking-[0.06em] text-[#8b96a5]">{key}</span>
        <span className="font-medium text-[#f3f4f6]">{yPct.toFixed(0)}%</span>
        <span className="font-medium" style={{ color: up ? "#22c55e" : "#ef4444" }}>
          {up ? "+" : ""}{delta}%
        </span>
      </div>,
    );
  }

  // Live crypto prices
  for (const c of TRACKED_COINS) {
    const p = prices?.[c.id as CoinId]?.usd;
    if (p === undefined) continue;
    nodes.push(
      <div key={`c-${c.id}`} className="mono flex items-center gap-2 text-[11px] whitespace-nowrap">
        <span className="tracking-[0.06em] text-[#8b96a5]">{c.symbol}</span>
        <span className="font-medium text-[#f3f4f6]">{formatUsd(p)}</span>
      </div>,
    );
  }

  if (nodes.length === 0) {
    nodes.push(
      <div key="empty" className="mono text-[11px] text-[#6b7280] whitespace-nowrap">
        Awaiting market data…
      </div>,
    );
  }

  return (
    <div className="flex gap-6 sm:gap-8 shrink-0 pr-6 sm:pr-8">
      {nodes}
    </div>
  );
}

export default function Ticker() {
  const { data: addresses } = useAllMarketAddresses();
  const { prices } = usePrices();
  const [entries, setEntries] = useState<Record<string, TickEntry | null>>({});

  const handleLoad = useCallback((addr: `0x${string}`, entry: TickEntry | null) => {
    setEntries((prev) => {
      const existing = prev[addr];
      if (!existing && !entry) return prev;
      if (!existing || !entry) return { ...prev, [addr]: entry };
      if (
        existing.totalPool === entry.totalPool &&
        existing.yesOdds === entry.yesOdds &&
        existing.market.question === entry.market.question
      ) {
        return prev;
      }
      return { ...prev, [addr]: entry };
    });
  }, []);

  const addrList = useMemo(() => addresses ?? [], [addresses]);
  const loaded = useMemo(
    () => addrList.map((a) => entries[a]).filter((e): e is TickEntry => !!e),
    [addrList, entries],
  );

  return (
    <>
      {addrList.map((a) => (
        <TickerLoader key={a} address={a} onLoad={handleLoad} />
      ))}
      <div className="border-b border-[#1f2630] bg-[#0b0e12] h-[30px] flex items-center overflow-hidden px-3 sm:px-6 lg:px-8 sticky top-[56px] z-40 max-w-full">
        <div className="mono label shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#1f2630] bg-[#131820] px-2 py-0.5 text-[9px] tracking-[0.16em] text-[#8b96a5] mr-3 sm:mr-4">
          <span aria-hidden className="text-[7px] leading-none text-[#2d9cdb]">◉</span> LIVE
        </div>
        <div className="flex-1 min-w-0 overflow-hidden relative">
          <div className="ticker-track flex">
            <TickerRow items={loaded} prices={prices} />
            <TickerRow items={loaded} prices={prices} />
          </div>
        </div>
      </div>
    </>
  );
}
