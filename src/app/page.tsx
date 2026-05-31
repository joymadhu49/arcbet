"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAllMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import MarketCard from "@/components/MarketCard";
import { CATEGORIES, Category } from "@/lib/constants";
import { usePrices } from "@/components/PriceProvider";
import { parseCryptoDescription } from "@/lib/cryptoMarkets";
import { fmtUSDCCompact } from "@/lib/utils";
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

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("trending");
  const [search, setSearch] = useState("");
  const { prices } = usePrices();
  const { data: addresses, isLoading } = useAllMarketAddresses();

  const [entries, setEntries] = useState<Record<string, MarketEntry | null>>({});

  const handleLoad = useCallback((addr: `0x${string}`, entry: MarketEntry | null) => {
    setEntries((prev) => {
      const existing = prev[addr];
      if (!existing && !entry) return prev;
      if (!existing || !entry) return { ...prev, [addr]: entry };
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

  const visible = useMemo(() => {
    // Hide resolved/cancelled markets from the main feed — they live at their detail URL.
    let list = loadedEntries.filter((e) => !e.market.resolved);
    if (activeCategory !== "All") list = list.filter((e) => e.market.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.market.question.toLowerCase().includes(q) ||
          e.market.category.toLowerCase().includes(q) ||
          e.address.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === "trending") {
      sorted.sort((a, b) => Number((b.totalPool ?? 0n) - (a.totalPool ?? 0n)));
    } else if (sort === "new") {
      const idx = new Map(addrList.map((a, i) => [a, i]));
      sorted.sort((a, b) => (idx.get(a.address)! - idx.get(b.address)!));
    } else if (sort === "closing") {
      sorted.sort((a, b) => a.market.resolutionTime - b.market.resolutionTime);
    }
    return sorted;
  }, [loadedEntries, activeCategory, search, sort, addrList]);

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
      {addrList.map((a) => (
        <MarketLoader key={a} address={a} onLoad={handleLoad} />
      ))}

      {/* Search header */}
      <div className="border-b border-[#1f2630] px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5">
        <div className="flex items-baseline gap-[10px] sm:gap-[14px] mb-[14px] sm:mb-[18px] flex-wrap">
          <h1 className="m-0 text-[20px] sm:text-[22px] font-semibold tracking-[-0.4px] text-[#f3f4f6]">Markets</h1>
          <div className="mono label text-[#6b7280]">
            {openMarkets} active · {fmtUSDCCompact(totalVolume)} volume
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 flex items-center gap-[10px] bg-[#131820] border border-[#1f2630] px-[14px] py-[11px] sm:py-[10px] rounded-[8px] min-h-[44px] transition-colors duration-150 ease-out focus-within:border-[#2d9cdb] hover:border-[#2a3340]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#6b7280" strokeWidth="1.5" aria-hidden>
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5 L13 13" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets, categories…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#f3f4f6] text-[13px]"
            />
            <span className="mono text-[10px] text-[#6b7280] border border-[#1f2630] px-[6px] py-[2px] rounded-[6px] tracking-[0.04em] hidden sm:inline">
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-[#1f2630] px-4 sm:px-6 lg:px-8 min-h-[48px] py-2 flex items-center gap-[8px] sticky top-[86px] z-30 bg-[#0b0e12] overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => {
          const active = activeCategory === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`chip${active ? " chip-active" : ""} px-[13px] py-[7px] sm:py-[6px] text-[12px] font-medium shrink-0 cursor-pointer min-h-[44px] sm:min-h-[32px]`}
            >
              {c}
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="mono label text-[#6b7280] hidden sm:inline">Sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-[#131820] border border-[#1f2630] hover:border-[#2a3340] text-[#f3f4f6] px-[12px] py-[7px] sm:py-[6px] rounded-[8px] text-[12px] cursor-pointer outline-none focus-visible:border-[#2d9cdb] transition-colors duration-150 ease-out shrink-0 min-h-[44px] sm:min-h-[32px]"
        >
          <option value="trending">24h Volume</option>
          <option value="new">New</option>
          <option value="closing">Closing soon</option>
        </select>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-56 rounded-[12px] border border-[#1f2630] skeleton" />
            ))}
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="border border-dashed border-[#1f2630] rounded-[12px] py-20 text-center">
            <div className="text-[14px] font-medium text-[#f3f4f6]">No markets yet</div>
            <p className="mt-1 text-[12.5px] text-[#6b7280]">
              Deploy contracts and launch the first daily batch from the admin panel.
            </p>
          </div>
        ) : visible.length === 0 && loadedEntries.length === addrList.length ? (
          <div className="border border-dashed border-[#1f2630] rounded-[12px] py-16 text-center text-[12.5px] text-[#6b7280]">
            No markets match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-rise">
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
            {addrList.length > loadedEntries.length &&
              Array.from({ length: Math.min(3, addrList.length - loadedEntries.length) }).map(
                (_, i) => (
                  <div key={`skel-${i}`} className="h-56 rounded-[12px] border border-[#1f2630] skeleton" />
                ),
              )}
          </div>
        )}
      </div>
    </>
  );
}
