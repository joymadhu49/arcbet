"use client";
import { useEffect, useMemo, useState } from "react";
import { useWriteContract } from "wagmi";
import { toast } from "sonner";
import Link from "next/link";
import {
  Shield, Plus, CheckCircle, XCircle, Loader2, Zap, RefreshCw,
  Flame, LineChart, Lock,
} from "lucide-react";

import { FACTORY_ADDRESS } from "@/lib/constants";
import { MARKET_FACTORY_ABI } from "@/lib/abi";
import { useAllMarketAddresses, useMarketData } from "@/hooks/useMarkets";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { formatUSDC, timeLeft } from "@/lib/utils";
import { TRACKED_COINS, formatUsd, type PriceMap } from "@/lib/coingecko";
import { usePrices } from "@/components/PriceProvider";
import {
  buildDailyMarket, parseCryptoDescription, buildCryptoQuestion,
} from "@/lib/cryptoMarkets";
import { AiMarketCreator } from "@/components/AiMarketCreator";

// ───────────────────────── Auto-resolve card ─────────────────────────
function ResolveRow({
  address,
  prices,
  onDone,
}: {
  address: `0x${string}`;
  prices: PriceMap | null;
  onDone: () => void;
}) {
  const { market, refetch } = useMarketData(address);
  const { writeContractAsync } = useWriteContract();
  const [pending, setPending] = useState<"yes" | "no" | "cancel" | "auto" | null>(null);

  if (!market) return null;
  const meta = parseCryptoDescription(market.description);
  const nowSec = Math.floor(Date.now() / 1000);
  const due = market.resolutionTime <= nowSec;

  const livePrice = meta && prices?.[meta.coin]?.usd;
  const predictedYes = meta && livePrice ? livePrice > meta.targetUsd : undefined;

  async function resolve(yesWon: boolean) {
    setPending(yesWon ? "yes" : "no");
    try {
      toast.loading("Resolving…", { id: "resolve" });
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "resolveMarket",
        args: [address, yesWon],
      });
      toast.success(`Resolved: ${yesWon ? "YES" : "NO"} won`, { id: "resolve" });
      refetch();
      onDone();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Failed", { id: "resolve" });
    } finally {
      setPending(null);
    }
  }

  async function cancel() {
    setPending("cancel");
    try {
      toast.loading("Cancelling…", { id: "cancel" });
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "cancelMarket",
        args: [address],
      });
      toast.success("Cancelled", { id: "cancel" });
      refetch();
      onDone();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Failed", { id: "cancel" });
    } finally {
      setPending(null);
    }
  }

  async function autoResolve() {
    if (predictedYes === undefined) return;
    setPending("auto");
    try {
      toast.loading(`Auto-resolving → ${predictedYes ? "YES" : "NO"}…`, { id: "auto" });
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "resolveMarket",
        args: [address, predictedYes],
      });
      toast.success(`Auto-resolved: ${predictedYes ? "YES" : "NO"}`, { id: "auto" });
      refetch();
      onDone();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Failed", { id: "auto" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#262d39] bg-[#151a21] p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/market/${address}`}
              className="text-sm font-semibold text-[#f3f4f6] hover:text-[#3b82f6] transition-colors line-clamp-1"
            >
              {market.question}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
              <span className="rounded bg-[#262d39] px-1.5 py-0.5 text-[#9aa5b1]">{market.category}</span>
              <span>{timeLeft(market.resolutionTime)}</span>
              <span>·</span>
              <span>Vol: {formatUSDC(market.totalYes + market.totalNo)}</span>
              {market.resolved && (
                <><span>·</span><span className="text-[#f59e0b]">Resolved: {market.outcome}</span></>
              )}
            </div>
          </div>
          {due && !market.resolved && (
            <span className="rounded-full bg-[#f59e0b]/15 px-2 py-0.5 text-[10px] font-semibold text-[#f59e0b]">
              DUE
            </span>
          )}
        </div>

        {/* Crypto-market auto-resolve strip */}
        {meta && !market.resolved && (
          <div className="flex items-center justify-between rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <LineChart className="h-3.5 w-3.5 text-[#a855f7]" />
              <span className="text-[#9aa5b1]">
                Target <span className="text-[#f3f4f6] font-mono">{formatUsd(meta.targetUsd)}</span>
                <span className="mx-1.5 text-[#363d4b]">·</span>
                Live <span className="font-mono" style={{ color: predictedYes === undefined ? "#6b7280" : predictedYes ? "#22c55e" : "#ef4444" }}>
                  {livePrice ? formatUsd(livePrice) : "loading…"}
                </span>
              </span>
            </div>
            <button
              onClick={autoResolve}
              disabled={!!pending || predictedYes === undefined}
              className="flex items-center gap-1 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 px-2 py-1 text-[#3b82f6] hover:bg-[#3b82f6]/20 disabled:opacity-40 transition-colors"
            >
              {pending === "auto" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Auto-resolve
            </button>
          </div>
        )}

        {!market.resolved && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => resolve(true)}
              disabled={!!pending}
              className="flex items-center gap-1.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1.5 text-xs font-semibold text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-50 transition-colors"
            >
              {pending === "yes" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              YES Won
            </button>
            <button
              onClick={() => resolve(false)}
              disabled={!!pending}
              className="flex items-center gap-1.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 px-3 py-1.5 text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/20 disabled:opacity-50 transition-colors"
            >
              {pending === "no" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              NO Won
            </button>
            <button
              onClick={cancel}
              disabled={!!pending}
              className="flex items-center gap-1.5 rounded-xl border border-[#262d39] px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#9aa5b1] disabled:opacity-50 transition-colors"
            >
              {pending === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Daily creator ─────────────────────────
function DailyCreator({
  prices,
  onCreated,
}: {
  prices: PriceMap | null;
  onCreated: () => void;
}) {
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null); // coin id or "all"

  async function createOne(coinId: (typeof TRACKED_COINS)[number]["id"]) {
    const coin = TRACKED_COINS.find((c) => c.id === coinId)!;
    const price = prices?.[coinId]?.usd;
    if (!price) {
      toast.error("Price unavailable — refresh first");
      return;
    }
    setBusy(coinId);
    try {
      const m = buildDailyMarket(coin, price);
      toast.loading(`Creating ${coin.symbol} 24h market…`, { id: `m-${coinId}` });
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "createMarket",
        args: [m.question, m.description, m.category, m.imageUrl, m.resolutionTime],
      });
      toast.success(`${coin.symbol} market created`, { id: `m-${coinId}` });
      onCreated();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Failed", { id: `m-${coinId}` });
    } finally {
      setBusy(null);
    }
  }

  async function createAll() {
    setBusy("all");
    try {
      for (const c of TRACKED_COINS) {
        const price = prices?.[c.id]?.usd;
        if (!price) continue;
        const m = buildDailyMarket(c, price);
        toast.loading(`Creating ${c.symbol}…`, { id: "m-all" });
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: MARKET_FACTORY_ABI,
          functionName: "createMarket",
          args: [m.question, m.description, m.category, m.imageUrl, m.resolutionTime],
        });
      }
      toast.success("All 5 daily markets created", { id: "m-all" });
      onCreated();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Batch failed", { id: "m-all" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#262d39] bg-[#151a21] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f3f4f6]">
          <Flame className="h-4 w-4 text-[#f59e0b]" /> Daily crypto markets (24h)
        </h3>
        <button
          onClick={createAll}
          disabled={!!busy || !prices}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#a855f7] px-3 py-1.5 text-xs font-bold text-[#151a21] disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {busy === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Launch all 5
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRACKED_COINS.map((coin) => {
          const price = prices?.[coin.id]?.usd;
          const target = price ? price * 1.02 : null;
          return (
            <button
              key={coin.id}
              onClick={() => createOne(coin.id)}
              disabled={!!busy || !price}
              className="group flex items-center justify-between rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-left hover:border-[#3b82f6]/40 disabled:opacity-40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: `${coin.color}20`, color: coin.color }}
                >
                  {coin.symbol[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#f3f4f6]">{coin.symbol}</div>
                  <div className="text-[10px] text-[#6b7280]">
                    {price ? formatUsd(price) : "—"}
                    {target && <span className="text-[#22c55e]"> → {formatUsd(target)}</span>}
                  </div>
                </div>
              </div>
              {busy === coin.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#3b82f6]" />
              ) : (
                <Plus className="h-4 w-4 text-[#363d4b] group-hover:text-[#3b82f6]" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-[#6b7280]">
        Targets are set +2% above the live CoinGecko spot. Auto-resolved from CoinGecko 24 hours after creation.
      </p>
    </div>
  );
}

// ───────────────────────── Custom creator ─────────────────────────
function CustomCreator({ onCreated }: { onCreated: () => void }) {
  const { writeContractAsync } = useWriteContract();
  const [form, setForm] = useState({
    question: "",
    description: "",
    category: "Crypto",
    imageUrl: "",
    resolutionDays: "7",
  });
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      toast.loading("Creating market…", { id: "create" });
      const resolutionTime = BigInt(Math.floor(Date.now() / 1000) + Number(form.resolutionDays) * 86400);
      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "createMarket",
        args: [form.question, form.description, form.category, form.imageUrl, resolutionTime],
      });
      toast.success("Market created", { id: "create" });
      setForm({ question: "", description: "", category: "Crypto", imageUrl: "", resolutionDays: "7" });
      onCreated();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Failed", { id: "create" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#262d39] bg-[#151a21] p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f3f4f6]">
        <Plus className="h-4 w-4" /> Custom market
      </h3>
      <div>
        <label className="mb-1 block text-xs text-[#6b7280]">Question *</label>
        <input
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          required
          placeholder="Will BTC hit $200k by end of 2026?"
          className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#3b82f6] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[#6b7280]">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          rows={3}
          placeholder="Resolution criteria…"
          className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#3b82f6] focus:outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#6b7280]">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] focus:border-[#3b82f6] focus:outline-none"
          >
            {["Crypto", "Sports", "Politics", "Tech", "Entertainment"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#6b7280]">Resolves in (days)</label>
          <input
            type="number"
            min="1"
            value={form.resolutionDays}
            onChange={(e) => setForm({ ...form, resolutionDays: e.target.value })}
            className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] focus:border-[#3b82f6] focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-[#6b7280]">Image URL (optional)</label>
        <input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://…"
          className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#3b82f6] focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={creating}
        className="w-full rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#a855f7] py-2.5 text-sm font-bold text-[#151a21] hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {creating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </span>
        ) : (
          "Create Market"
        )}
      </button>
    </form>
  );
}

// ───────────────────────── Page ─────────────────────────
export default function AdminPage() {
  const isAdmin = useIsAdmin();
  const { data: addresses, isLoading, refetch } = useAllMarketAddresses();
  const { prices, loading: loadingPrices, error: pricesError, refresh: loadPrices } = usePrices();

  useEffect(() => {
    if (pricesError && !prices) {
      toast.error(`CoinGecko: ${pricesError.message}`, { id: "cg-err" });
    }
  }, [pricesError, prices]);

  // Sort: due-for-resolution first, then newest
  const sortedAddrs = useMemo(() => (addresses ? [...addresses].reverse() : []), [addresses]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Lock className="mx-auto mb-4 h-12 w-12 text-[#363d4b]" />
        <h2 className="mb-2 text-lg font-bold text-[#f3f4f6]">Not Found</h2>
        <p className="text-sm text-[#6b7280]">
          This page doesn&apos;t exist, or your wallet isn&apos;t authorised.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ef4444]/10">
            <Shield className="h-5 w-5 text-[#ef4444]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f3f4f6]">Admin</h1>
            <p className="text-xs text-[#6b7280]">Gated to owner wallet · on-chain authority enforced by MarketFactory</p>
          </div>
        </div>
        <button
          onClick={loadPrices}
          disabled={loadingPrices}
          className="flex items-center gap-1.5 rounded-xl border border-[#262d39] bg-[#151a21] px-3 py-1.5 text-xs text-[#9aa5b1] hover:border-[#363d4b] hover:text-[#f3f4f6] transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loadingPrices ? "animate-spin" : ""}`} />
          Refresh prices
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Left: creators */}
        <div className="space-y-6">
          <AiMarketCreator prices={prices} onCreated={refetch} />
          <DailyCreator prices={prices} onCreated={refetch} />
          <CustomCreator onCreated={refetch} />
        </div>

        {/* Right: markets list */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-[#9aa5b1]">
            All markets ({addresses?.length ?? 0})
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#3b82f6]" />
            </div>
          ) : sortedAddrs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#262d39] py-10 text-center text-sm text-[#363d4b]">
              No markets yet — launch your first daily batch above.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAddrs.map((addr) => (
                <ResolveRow key={addr} address={addr} prices={prices} onDone={refetch} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep the crypto-question helper reachable to avoid tree-shaking surprises in dev.
void buildCryptoQuestion;
