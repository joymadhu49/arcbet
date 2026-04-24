"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAllMarketAddresses,
  useMarketData,
  useUserShares,
  usePreviewPayout,
} from "@/hooks/useMarkets";
import { shortenAddress, seededSparkline } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useBet } from "@/hooks/useBet";
import { MarketData } from "@/types";
import { arcTestnet } from "@/lib/chains";
import { USDC_ADDRESS } from "@/lib/constants";
import { PREDICTION_MARKET_ABI } from "@/lib/abi";
import { txErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import CoinIcon from "@/components/ui/CoinIcon";

type Filter = "all" | "open" | "claimable" | "resolved";

interface Position {
  marketAddress: `0x${string}`;
  market: MarketData;
  side: "YES" | "NO";
  shares: bigint;
  payout: bigint;
  yesOdds?: bigint;
  noOdds?: bigint;
  claimable: boolean;
  resolved: boolean;
  alreadyClaimed: boolean;
  status: "open" | "claimable" | "claimed" | "resolved-win" | "resolved-loss";
}

/** Extract (yesShares, noShares) from the raw `getUserShares` return value.
 *  viem's output shape can be either a tuple `[bigint, bigint]` or an object
 *  `{yes, no}` depending on ABI-type inference, so we handle both and also
 *  tolerate it being undefined while the query is in flight. */
function extractShares(raw: unknown): [bigint, bigint] {
  if (!raw) return [0n, 0n];
  if (Array.isArray(raw)) {
    return [raw[0] ?? 0n, raw[1] ?? 0n];
  }
  if (typeof raw === "object") {
    const o = raw as { yes?: bigint; no?: bigint };
    return [o.yes ?? 0n, o.no ?? 0n];
  }
  return [0n, 0n];
}

function PositionLoader({
  marketAddress,
  userAddress,
  onLoad,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  onLoad: (addr: `0x${string}`, pos: Position | null) => void;
}) {
  const { market, yesOdds, noOdds } = useMarketData(marketAddress);
  const { data: shares } = useUserShares(marketAddress, userAddress);
  const { data: payout } = usePreviewPayout(marketAddress, userAddress);
  const { data: claimedFlag } = useReadContract({
    address: marketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: "claimed",
    args: [userAddress],
    query: {
      enabled: !!userAddress,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 5_000,
    },
  });

  const [userYes, userNo] = extractShares(shares);
  const hasShares = userYes > 0n || userNo > 0n;
  const alreadyClaimed = Boolean(claimedFlag);

  const fp = market
    ? [
        market.question,
        market.resolved ? 1 : 0,
        market.outcome ?? "",
        userYes.toString(),
        userNo.toString(),
        (payout as bigint | undefined)?.toString() ?? "",
        alreadyClaimed ? 1 : 0,
      ].join("|")
    : "";

  useEffect(() => {
    if (!market) {
      onLoad(marketAddress, null);
      return;
    }
    if (!hasShares) {
      onLoad(marketAddress, null);
      return;
    }
    const side = userYes > 0n ? "YES" : "NO";
    const shareAmount = userYes > 0n ? userYes : userNo;
    const payoutVal = (payout as bigint | undefined) ?? 0n;

    let status: Position["status"];
    if (!market.resolved) status = "open";
    else if (alreadyClaimed) status = "claimed";
    else if (payoutVal > 0n) status = "claimable";
    else if (market.outcome === side) status = "resolved-win";
    else status = "resolved-loss";

    onLoad(marketAddress, {
      marketAddress,
      market,
      side,
      shares: shareAmount,
      payout: payoutVal,
      yesOdds,
      noOdds,
      claimable: market.resolved && payoutVal > 0n && !alreadyClaimed,
      resolved: market.resolved,
      alreadyClaimed,
      status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketAddress, fp, hasShares]);

  return null;
}

function SellButton({ marketAddress }: { marketAddress: `0x${string}` }) {
  const router = useRouter();
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/market/${marketAddress}?mode=sell`);
      }}
      className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-[#2d9cdb] border border-[#2d9cdb] bg-transparent rounded-[2px] px-[8px] py-[4px] hover:bg-[#2d9cdb] hover:text-[#0b0e12] transition-colors cursor-pointer"
    >
      Sell →
    </button>
  );
}

function ClaimButton({ address }: { address: `0x${string}` }) {
  const { claimWinnings, isLoading } = useBet(address);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        claimWinnings();
      }}
      disabled={isLoading}
      className="bg-[#f59e0b] text-[#0b0e12] border-none px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase rounded-[2px] cursor-pointer disabled:opacity-40"
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
    </button>
  );
}

function PositionRow({ p, i }: { p: Position; i: number }) {
  const sideColor = p.side === "YES" ? "#22c55e" : "#ef4444";
  const yPct = p.yesOdds ? Number(p.yesOdds) / 1e16 : 50;
  const currentPriceCents = p.side === "YES" ? yPct : 100 - yPct;
  const sharesDollars = Number(p.shares) / 1e6;
  const currentValue = (sharesDollars * currentPriceCents) / 100;
  const payoutDollars = Number(p.payout) / 1e6;

  let statusNode: React.ReactNode;
  if (p.status === "open") {
    statusNode = (
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center gap-[6px]">
          <div className="w-[6px] h-[6px] rounded-[3px] bg-[#22c55e]" />
          <span className="mono text-[11px] text-[#8b96a5]">Open</span>
        </div>
        <SellButton marketAddress={p.marketAddress} />
      </div>
    );
  } else if (p.status === "claimable") {
    statusNode = <ClaimButton address={p.marketAddress} />;
  } else if (p.status === "claimed") {
    statusNode = <span className="mono text-[11px] text-[#22c55e]">✓ Claimed</span>;
  } else if (p.status === "resolved-win") {
    statusNode = <span className="mono text-[11px] text-[#22c55e]">✓ Won</span>;
  } else {
    statusNode = <span className="mono text-[11px] text-[#ef4444]">✕ Lost</span>;
  }

  return (
    <Link
      href={`/market/${p.marketAddress}`}
      className="grid gap-[10px] items-center px-[18px] py-[14px] border-b border-[#1f2630] transition-colors hover:bg-[#0f141b]"
      style={{
        gridTemplateColumns: "1.8fr 72px 100px 120px 120px 170px",
        background: i % 2 ? "#131820" : "transparent",
      }}
    >
      <div className="flex items-center gap-[10px] min-w-0">
        <CoinIcon market={p.market} size={28} />
        <div className="min-w-0">
          <div className="text-[13px] text-[#f3f4f6] font-medium leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap">
            {p.market.question}
          </div>
          <div className="mono label text-[#6b7280] mt-[2px]">
            {p.market.category}
          </div>
        </div>
      </div>
      <div
        className="justify-self-start px-[8px] py-[3px] rounded-[2px] text-[10px] font-bold tracking-[0.12em] text-center"
        style={{
          color: sideColor,
          border: `1px solid ${sideColor}`,
          background: p.side === "YES" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
        }}
      >
        {p.side}
      </div>
      <div className="mono text-[13px] text-[#f3f4f6] text-right">
        {sharesDollars.toFixed(2)}
      </div>
      <div className="text-right">
        <div className="mono text-[13px] text-[#f3f4f6]">${currentValue.toFixed(2)}</div>
        <div className="mono label text-[#6b7280] mt-[2px]">@ {currentPriceCents.toFixed(0)}¢</div>
      </div>
      <div className="text-right">
        <div className="mono text-[13px] text-[#f3f4f6]">${payoutDollars.toFixed(2)}</div>
      </div>
      <div className="justify-self-end">{statusNode}</div>
    </Link>
  );
}

function PortfolioSummaryCards({
  positions,
  claimables,
  onClaimAll,
  claimAllLoading,
}: {
  positions: Position[];
  claimables: Position[];
  onClaimAll: () => void;
  claimAllLoading: boolean;
}) {
  const open = positions.filter((p) => p.status === "open");
  const currentValue = open.reduce((acc, p) => {
    const yPct = p.yesOdds ? Number(p.yesOdds) / 1e16 : 50;
    const priceCents = p.side === "YES" ? yPct : 100 - yPct;
    return acc + (Number(p.shares) / 1e6) * (priceCents / 100);
  }, 0);
  const claimable = claimables.reduce((acc, p) => acc + Number(p.payout) / 1e6, 0);

  const cards: Array<{
    label: string;
    value: string;
    sub?: string;
    valColor?: string;
    subColor?: string;
    claim?: boolean;
  }> = [
    { label: "Portfolio value", value: `$${currentValue.toFixed(2)}`, sub: `${open.length} open positions` },
    { label: "Open positions", value: String(open.length), sub: `Across ${new Set(open.map((p) => p.marketAddress)).size} markets` },
    {
      label: "Unrealized P&L",
      value: "—",
      sub: "Cost basis not tracked on-chain",
      valColor: "#8b96a5",
    },
    {
      label: "Claimable",
      value: `$${claimable.toFixed(2)}`,
      sub: `${claimables.length} resolved market${claimables.length === 1 ? "" : "s"}`,
      valColor: claimables.length > 0 ? "#f59e0b" : "#8b96a5",
      claim: claimables.length > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
      {cards.map((c, i) => (
        <div
          key={i}
          className="relative overflow-hidden border border-[#1f2630] bg-[#131820] rounded-[4px] p-4 flex flex-col gap-[6px]"
        >
          <div className="label">{c.label}</div>
          <div
            className="mono text-[26px] font-semibold tracking-[-0.5px]"
            style={{ color: c.valColor || "#f3f4f6" }}
          >
            {c.value}
          </div>
          <div className="mono text-[11px]" style={{ color: c.subColor || "#8b96a5" }}>
            {c.sub}
          </div>
          {c.claim && (
            <button
              onClick={onClaimAll}
              disabled={claimAllLoading}
              className="absolute right-[14px] top-[14px] bg-[#f59e0b] text-[#0b0e12] border-none px-[10px] py-[5px] text-[10px] font-bold tracking-[0.14em] uppercase rounded-[2px] cursor-pointer disabled:opacity-40"
            >
              {claimAllLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim all"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function PnLCurve({ positions }: { positions: Position[] }) {
  const seed = positions.map((p) => p.marketAddress).join("|") || "no-data";
  const pts = useMemo(() => {
    const raw = seededSparkline(seed, 80, 60);
    return raw.map((v) => v * 200 - 100); // normalise to -100..100
  }, [seed]);
  const W = 900,
    H = 90;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const coords = pts.map((val, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((val - min) / range) * (H - 4) - 2;
    return [x, y] as const;
  });
  const path = coords.map((p, i) => (i === 0 ? "M" : "L") + p.join(" ")).join(" ");
  const last = coords[coords.length - 1];
  const area = `${path} L${last[0]} ${H} L0 ${H} Z`;
  const illustrative = positions.length === 0;

  return (
    <div className="border border-[#1f2630] bg-[#131820] rounded-[4px] p-4">
      <div className="flex justify-between items-baseline mb-[10px] flex-wrap gap-2">
        <div>
          <div className="label mb-1">Cumulative P&L · illustrative</div>
          <div className="mono text-[18px] font-semibold text-[#8b96a5]">
            {illustrative ? "Tracks once positions accumulate" : `${positions.length} positions`}
          </div>
        </div>
        <div className="flex gap-1">
          {["7D", "30D", "90D", "ALL"].map((t, i) => (
            <span
              key={t}
              className="mono text-[10px] tracking-[0.08em] rounded-[2px] px-2 py-[3px]"
              style={{
                background: i === 1 ? "#1f2630" : "transparent",
                border: `1px solid ${i === 1 ? "#2a3340" : "transparent"}`,
                color: i === 1 ? "#f3f4f6" : "#8b96a5",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
      >
        <defs>
          <linearGradient id="pnlFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0.25" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pnlFill)" />
        <path d={path} fill="none" stroke="#22c55e" strokeWidth="1.3" />
      </svg>
    </div>
  );
}

function PortfolioTable({ positions }: { positions: Position[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(() => {
    if (filter === "open") return positions.filter((p) => p.status === "open");
    if (filter === "claimable") return positions.filter((p) => p.status === "claimable");
    if (filter === "resolved")
      return positions.filter(
        (p) => p.status === "resolved-win" || p.status === "resolved-loss" || p.status === "claimed",
      );
    return positions;
  }, [positions, filter]);

  const tabs: { k: Filter; label: string; count: number; accent?: string }[] = [
    { k: "all", label: "All", count: positions.length },
    { k: "open", label: "Open", count: positions.filter((p) => p.status === "open").length },
    {
      k: "claimable",
      label: "Claimable",
      count: positions.filter((p) => p.status === "claimable").length,
      accent: "#f59e0b",
    },
    {
      k: "resolved",
      label: "Resolved",
      count: positions.filter(
        (p) => p.status === "resolved-win" || p.status === "resolved-loss" || p.status === "claimed",
      ).length,
    },
  ];

  const exportCSV = () => {
    const rows = [
      ["market", "category", "side", "shares", "payout_est", "status"].join(","),
      ...filtered.map((p) =>
        [
          JSON.stringify(p.market.question),
          p.market.category,
          p.side,
          (Number(p.shares) / 1e6).toFixed(2),
          (Number(p.payout) / 1e6).toFixed(2),
          p.status,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propex-positions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-[#1f2630] rounded-[4px] bg-[#131820] overflow-hidden">
      <div className="flex items-center border-b border-[#1f2630] pl-[14px] pr-[6px] overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const active = filter === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setFilter(t.k)}
              className="bg-transparent border-none px-3 py-[12px] text-[12px] font-medium cursor-pointer flex items-center gap-[6px] whitespace-nowrap -mb-px"
              style={{
                color: active ? "#f3f4f6" : "#8b96a5",
                borderBottom: `1.5px solid ${active ? "#2d9cdb" : "transparent"}`,
              }}
            >
              {t.label}
              <span
                className="mono text-[10px] bg-[#0b0e12] px-[5px] py-[1px] rounded-[2px]"
                style={{ color: t.accent || "#6b7280" }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="mono text-[11px] text-[#6b7280] mr-3 hidden sm:inline">
          {filtered.length} rows
        </div>
        <button
          onClick={exportCSV}
          className="bg-transparent border border-[#1f2630] text-[#8b96a5] px-[10px] py-[5px] text-[11px] rounded-[2px] cursor-pointer mr-[6px] hover:text-[#f3f4f6] hover:border-[#2a3340] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Scrollable table: the row grid needs >= 720px to read well; scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className="mono grid gap-[10px] text-[10px] uppercase tracking-[0.14em] text-[#6b7280] px-[18px] py-[10px] border-b border-[#1f2630] bg-[#0f141b]"
            style={{ gridTemplateColumns: "1.8fr 72px 100px 120px 120px 170px" }}
          >
            <span>Market</span>
            <span>Side</span>
            <span className="text-right">Shares</span>
            <span className="text-right">Current</span>
            <span className="text-right">Est. payout</span>
            <span className="text-right">Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[12.5px] text-[#6b7280]">
              No positions match this filter.
            </div>
          ) : (
            filtered.map((p, i) => <PositionRow key={p.marketAddress} p={p} i={i} />)
          )}
        </div>
      </div>
    </div>
  );
}

function PortfolioContent({ userAddress }: { userAddress: `0x${string}` }) {
  const { data: addresses, isLoading } = useAllMarketAddresses();
  const [positions, setPositions] = useState<Record<string, Position | null>>({});
  const [claimAllLoading, setClaimAllLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const handleLoad = useCallback((addr: `0x${string}`, pos: Position | null) => {
    setPositions((prev) => {
      const existing = prev[addr];
      if (!existing && !pos) return prev;
      if (!existing || !pos) return { ...prev, [addr]: pos };
      if (
        existing.shares === pos.shares &&
        existing.payout === pos.payout &&
        existing.status === pos.status
      ) {
        return prev;
      }
      return { ...prev, [addr]: pos };
    });
  }, []);

  const list = useMemo(
    () => Object.values(positions).filter((p): p is Position => !!p),
    [positions],
  );

  const claimables = list.filter((p) => p.status === "claimable");

  const onClaimAll = useCallback(async () => {
    if (claimables.length === 0) return;
    setClaimAllLoading(true);
    let done = 0;
    let failed = 0;
    for (const p of claimables) {
      try {
        toast.loading(`Claiming ${done + 1} of ${claimables.length}…`, { id: "claim-all" });
        const hash = await writeContractAsync({
          address: p.marketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: "claimWinnings",
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        done += 1;
      } catch (e: unknown) {
        failed += 1;
        toast.error(txErrorMessage(e), { id: "claim-all" });
        break;
      }
    }
    if (failed === 0) {
      toast.success(`Claimed ${done} market${done === 1 ? "" : "s"}`, { id: "claim-all" });
    }
    setClaimAllLoading(false);
  }, [claimables, writeContractAsync, publicClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[#8b96a5]" />
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="border border-dashed border-[#1f2630] rounded-[4px] py-16 text-center text-[12.5px] text-[#6b7280]">
        No markets yet.
      </div>
    );
  }

  return (
    <>
      {addresses.map((addr) => (
        <PositionLoader
          key={addr}
          marketAddress={addr}
          userAddress={userAddress}
          onLoad={handleLoad}
        />
      ))}

      <div className="mb-4">
        <PortfolioSummaryCards
          positions={list}
          claimables={claimables}
          onClaimAll={onClaimAll}
          claimAllLoading={claimAllLoading}
        />
      </div>
      <div className="mb-4">
        <PnLCurve positions={list} />
      </div>
      <div className="mb-10">
        <PortfolioTable positions={list} />
      </div>
    </>
  );
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onCopyUsdc = () => {
    navigator.clipboard.writeText(USDC_ADDRESS).then(() => {
      toast.success("USDC address copied", {
        description: "Send testnet USDC from your faucet to this wallet.",
      });
    });
  };

  // Hard-refresh every read-contract query so new positions appear immediately.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey?.[0];
          return typeof key === "string" && key.startsWith("readContract");
        },
      });
      toast.success("Positions refreshed");
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <div className="bg-[#0b0e12]">
      <div className="px-4 sm:px-6 lg:px-8 pt-7 pb-5">
        <div className="flex items-center justify-between mb-[18px] flex-wrap gap-3">
          <div>
            <h1 className="m-0 text-[22px] font-semibold tracking-[-0.4px] text-[#f3f4f6]">
              Portfolio
            </h1>
            <div className="mono label text-[#6b7280] mt-1">
              {isConnected && address ? (
                <>
                  {shortenAddress(address)} · {arcTestnet.name}
                </>
              ) : (
                "Connect wallet to view positions"
              )}
            </div>
          </div>
          {isConnected && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="bg-transparent border border-[#1f2630] text-[#f3f4f6] px-[14px] py-[8px] rounded-[4px] cursor-pointer text-[12px] font-medium hover:border-[#2a3340] transition-colors disabled:opacity-50 flex items-center gap-[6px]"
              >
                <RefreshCw className={`h-[12px] w-[12px] ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={onCopyUsdc}
                className="bg-transparent border border-[#1f2630] text-[#f3f4f6] px-[14px] py-[8px] rounded-[4px] cursor-pointer text-[12px] font-medium hover:border-[#2a3340] transition-colors"
              >
                Deposit USDC
              </button>
              <button
                disabled
                className="bg-[#131820] border border-[#2a3340] text-[#8b96a5] px-[14px] py-[8px] rounded-[4px] cursor-not-allowed text-[12px] font-medium opacity-60"
              >
                Withdraw · soon
              </button>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="border border-dashed border-[#1f2630] rounded-[4px] py-16 text-center">
            <div className="text-[13.5px] font-medium text-[#f3f4f6]">Connect your wallet</div>
            <p className="mt-1 text-[12.5px] text-[#6b7280]">
              Connect to view your positions and claim winnings.
            </p>
          </div>
        ) : (
          <PortfolioContent userAddress={address!} />
        )}
      </div>
    </div>
  );
}
