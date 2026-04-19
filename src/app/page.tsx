"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAllMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import MarketCard from "@/components/MarketCard";
import { CATEGORIES, Category } from "@/lib/constants";
import { Search } from "lucide-react";
import { TRACKED_COINS, formatUsd, type PriceMap, type CoinId } from "@/lib/coingecko";
import { usePrices } from "@/components/PriceProvider";
import { parseCryptoDescription } from "@/lib/cryptoMarkets";
import { formatUSDC } from "@/lib/utils";
import { MarketData } from "@/types";

type SortKey = "trending" | "new" | "closing";

interface MarketEntry {
  address: `0x${string}`;
  market: MarketData;
  totalPool?: bigint;
  yesOdds?: bigint;
  noOdds?: bigint;
}

function MarketLoader({
  address,
  onLoad,
}: {
  address: `0x${string}`;
  onLoad: (addr: `0x${string}`, entry: MarketEntry | null) => void;
}) {
  const { market, yesOdds, noOdds, totalPool, isLoading } = useMarketData(address);

  // Fingerprint the data with primitives so the effect only fires when values
  // (not object identities) actually change. wagmi returns fresh object refs on
  // every poll, which — combined with onLoad updating parent state — would
  // otherwise produce an infinite render loop.
  const fingerprint = market
    ? [
        market.question,
        market.resolved ? 1 : 0,
        market.outcome ?? "",
        market.resolutionTime,
        (yesOdds ?? 0n).toString(),
        (noOdds ?? 0n).toString(),
        (totalPool ?? 0n).toString(),
      ].join("|")
    : "";

  useEffect(() => {
    if (isLoading) return;
    onLoad(address, market ? { address, market, yesOdds, noOdds, totalPool } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, address, fingerprint, onLoad]);

  return null;
}

function PriceTicker({ prices, loading }: { prices: PriceMap | null; loading: boolean }) {
  return (
    <div className="border-y border-[#1f2630] bg-[#0b0e12]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-2 text-[11.5px]">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
            Spot
          </span>
          {TRACKED_COINS.map((c) => {
            const price = prices?.[c.id as CoinId]?.usd;
            return (
              <div key={c.id} className="flex items-center gap-1.5 shrink-0">
                <span
                  className="h-4 w-4 rounded-sm flex items-center justify-center text-[9px] font-bold"
                  style={{ background: `${c.color}22`, color: c.color }}
                >
                  {c.symbol[0]}
                </span>
                <span className="font-semibold text-[#f3f4f6]">{c.symbol}</span>
                {price !== undefined ? (
                  <span className="font-mono tabular text-[#8b96a5]">{formatUsd(price)}</span>
                ) : loading ? (
                  <span className="skeleton inline-block h-3 w-12 rounded-sm" />
                ) : (
                  <span className="font-mono text-[#3a4250]">—</span>
                )}
              </div>
            );
          })}
          <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[#6b7280]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-live" />
            <span>CoinGecko · 30s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("trending");
  const [search, setSearch] = useState("");
  const { prices, loading: pricesLoading } = usePrices();
  const { data: addresses, isLoading } = useAllMarketAddresses();

  // Keep a map of loaded market entries so we can compute totals + sort.
  const [entries, setEntries] = useState<Record<string, MarketEntry | null>>({});

  const handleLoad = useCallback((addr: `0x${string}`, entry: MarketEntry | null) => {
    setEntries((prev) => {
      const existing = prev[addr];
      // Both null → no-op
      if (!existing && !entry) return prev;
      // One null, the other not → change
      if (!existing || !entry) return { ...prev, [addr]: entry };
      // Both present → shallow value compare on the fields we actually use
      if (
        existing.totalPool === entry.totalPool &&
        existing.yesOdds === entry.yesOdds &&
        existing.noOdds === entry.noOdds &&
        existing.market.resolved === entry.market.resolved &&
        existing.market.outcome === entry.market.outcome &&
        existing.market.resolutionTime === entry.market.resolutionTime &&
        existing.market.question === entry.market.question
      ) {
        return prev;
      }
      return { ...prev, [addr]: entry };
    });
  }, []);

  const addrList = useMemo(() => (addresses ? [...addresses].reverse() : []), [addresses]);

  const loadedEntries = useMemo(
    () => addrList.map((a) => entries[a]).filter((e): e is MarketEntry => !!e),
    [entries, addrList],
  );

  // Filtered & sorted
  const visible = useMemo(() => {
    let list = loadedEntries;
    if (activeCategory !== "All") list = list.filter((e) => e.market.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.market.question.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "trending") {
      sorted.sort((a, b) => Number((b.totalPool ?? 0n) - (a.totalPool ?? 0n)));
    } else if (sort === "new") {
      // addrList is already reversed (newest first); keep original index order
      const idx = new Map(addrList.map((a, i) => [a, i]));
      sorted.sort((a, b) => (idx.get(a.address)! - idx.get(b.address)!));
    } else if (sort === "closing") {
      sorted.sort((a, b) => a.market.resolutionTime - b.market.resolutionTime);
    }
    return sorted;
  }, [loadedEntries, activeCategory, search, sort, addrList]);

  // KPIs across ALL loaded entries (not filtered) — these are testnet-wide
  const totalVolume = useMemo(
    () => loadedEntries.reduce((acc, e) => acc + (e.totalPool ?? 0n), 0n),
    [loadedEntries],
  );
  const openMarkets = useMemo(
    () => loadedEntries.filter((e) => !e.market.resolved).length,
    [loadedEntries],
  );

  return (
    <>
      {/* Mount loaders for each address so we collect data for KPIs + sort */}
      {addrList.map((a) => (
        <MarketLoader key={a} address={a} onLoad={handleLoad} />
      ))}

      {/* Ticker */}
      <PriceTicker prices={prices} loading={pricesLoading} />

      {/* Page header — title left, search right, KPIs inline */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#f3f4f6]">
                Markets
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#1f2630] bg-[#131820] px-2 py-0.5 text-[10px] font-medium text-[#8b96a5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-live" />
                Arc Testnet · USDC gas
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              Daily crypto prediction markets · Settled in USDC on Arc.
            </p>
          </div>

          {/* KPIs — three tight stats */}
          <div className="flex items-stretch gap-0 rounded-md border border-[#1f2630] bg-[#131820] overflow-hidden">
            <div className="px-4 py-2">
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Total Vol</div>
              <div className="font-mono tabular text-sm font-semibold text-[#f3f4f6]">
                {formatUSDC(totalVolume)}
              </div>
            </div>
            <div className="w-px bg-[#1f2630]" />
            <div className="px-4 py-2">
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Open</div>
              <div className="font-mono tabular text-sm font-semibold text-[#f3f4f6]">
                {openMarkets}
              </div>
            </div>
            <div className="w-px bg-[#1f2630]" />
            <div className="px-4 py-2">
              <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Total</div>
              <div className="font-mono tabular text-sm font-semibold text-[#f3f4f6]">
                {addrList.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky sub-nav: category tabs + search + sort */}
      <div className="sticky top-16 z-40 border-b border-[#1f2630] bg-[#0b0e12]/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 h-12">
            <div className="flex items-center gap-5 overflow-x-auto no-scrollbar flex-1">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`relative h-12 flex items-center shrink-0 text-[13px] transition-colors ${
                      active ? "text-[#f3f4f6]" : "text-[#8b96a5] hover:text-[#f3f4f6]"
                    }`}
                  >
                    {cat}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2d9cdb]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3a4250]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search markets"
                  className="w-56 rounded-md border border-[#1f2630] bg-[#131820] py-1.5 pl-8 pr-2.5 text-[12.5px] text-[#f3f4f6] placeholder-[#3a4250] focus:border-[#2d9cdb] focus:outline-none"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-[#1f2630] bg-[#131820] py-1.5 px-2 text-[12.5px] text-[#f3f4f6] focus:border-[#2d9cdb] focus:outline-none cursor-pointer"
              >
                <option value="trending">Trending</option>
                <option value="new">New</option>
                <option value="closing">Closing soon</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden mx-auto max-w-[1400px] px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3a4250]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets"
            className="w-full rounded-md border border-[#1f2630] bg-[#131820] py-2 pl-8 pr-2.5 text-[13px] text-[#f3f4f6] placeholder-[#3a4250] focus:border-[#2d9cdb] focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-lg border border-[#1f2630] skeleton" />
            ))}
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="border border-dashed border-[#1f2630] rounded-lg py-20 text-center">
            <div className="text-[14px] font-medium text-[#f3f4f6]">No markets yet</div>
            <p className="mt-1 text-[12.5px] text-[#6b7280]">
              Deploy contracts and launch the first daily batch from the admin panel.
            </p>
          </div>
        ) : visible.length === 0 && loadedEntries.length === addrList.length ? (
          <div className="border border-dashed border-[#1f2630] rounded-lg py-16 text-center text-[12.5px] text-[#6b7280]">
            No markets match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visible.map((e) => {
              const cryptoMeta = parseCryptoDescription(e.market.description);
              const livePrice = cryptoMeta ? prices?.[cryptoMeta.coin]?.usd : undefined;
              return (
                <MarketCard
                  key={e.address}
                  market={e.market}
                  yesOdds={e.yesOdds}
                  noOdds={e.noOdds}
                  totalPool={e.totalPool}
                  livePrice={livePrice}
                />
              );
            })}
            {/* Show skeletons for addresses still loading */}
            {addrList.length > loadedEntries.length &&
              Array.from({ length: Math.min(4, addrList.length - loadedEntries.length) }).map(
                (_, i) => (
                  <div key={`skel-${i}`} className="h-44 rounded-lg border border-[#1f2630] skeleton" />
                ),
              )}
          </div>
        )}
      </div>
    </>
  );
}
