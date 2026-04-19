"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Sparkles, Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";

import { FACTORY_ADDRESS } from "@/lib/constants";
import { MARKET_FACTORY_ABI } from "@/lib/abi";
import type { PriceMap } from "@/lib/coingecko";
import { COIN_BY_ID, formatUsd } from "@/lib/coingecko";
import {
  buildCryptoDescription,
  type CryptoMarketMeta,
} from "@/lib/cryptoMarkets";
import type {
  AiMarketProposal,
  AiMarketRequest,
  AiMarketResponse,
} from "@/lib/ai";

const QUICK_EXAMPLES = [
  "Will SOL close above $280 by end of week?",
  "Make a market on whether Bitcoin hits $150k this month",
  "Create a market for whether the Lakers win their next game in 3 days",
];

export function AiMarketCreator({ prices, onCreated }: { prices: PriceMap | null; onCreated: () => void }) {
  const { writeContractAsync } = useWriteContract();
  const [instruction, setInstruction] = useState("");
  const [thinking, setThinking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiMarketProposal | null>(null);

  // Editable fields once a proposal comes back.
  const [editQuestion, setEditQuestion] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDays, setEditDays] = useState(7);

  async function propose(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Type an instruction first.");
      return;
    }
    setError(null);
    setThinking(true);
    try {
      const payload: AiMarketRequest = { instruction: trimmed, coinPrices: prices };
      const res = await fetch("/api/ai-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as AiMarketResponse;
      if (!res.ok || !data.proposal) {
        throw new Error(data.error || `API ${res.status}`);
      }
      const p = data.proposal;
      setProposal(p);
      setEditQuestion(p.question);
      setEditDescription(p.description);
      setEditDays(p.resolutionDays);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setProposal(null);
    } finally {
      setThinking(false);
    }
  }

  async function confirm() {
    if (!proposal) return;
    setSubmitting(true);
    try {
      toast.loading("Creating market…", { id: "ai-create" });

      const nowSec = Math.floor(Date.now() / 1000);
      const resolutionTime = BigInt(nowSec + Math.round(editDays * 86_400));

      let description = editDescription;
      let imageUrl = proposal.imageUrl;

      // If the AI flagged a tracked coin, encode the ARCBET meta tag so the
      // auto-resolve admin path still works.
      if (proposal.crypto) {
        const coin = COIN_BY_ID[proposal.crypto.coin];
        const meta: CryptoMarketMeta = {
          type: "crypto_1d",
          coin: proposal.crypto.coin,
          startUsd: round2(proposal.crypto.startUsd),
          targetUsd: round2(proposal.crypto.targetUsd),
          createdAt: nowSec,
        };
        // Prepend the user-editable description, then the encoded tag.
        const encoded = buildCryptoDescription(meta);
        // `buildCryptoDescription` already contains human copy; splice the admin's edited
        // text in front so their tweaks are preserved alongside the machine tag.
        description = editDescription
          ? `${editDescription}\n\n${encoded}`
          : encoded;
        if (!imageUrl) imageUrl = coinImage(coin.id);
      }

      await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "createMarket",
        args: [editQuestion, description, proposal.category, imageUrl, resolutionTime],
      });

      toast.success("Market created", { id: "ai-create" });
      // reset flow
      setProposal(null);
      setInstruction("");
      setEditQuestion("");
      setEditDescription("");
      setEditDays(7);
      onCreated();
    } catch (e: unknown) {
      const shortMsg = (e as { shortMessage?: string })?.shortMessage;
      const msg = shortMsg || (e instanceof Error ? e.message : String(e));
      toast.error(msg, { id: "ai-create" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#262d39] bg-[#151a21] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#a855f7]" />
        <h3 className="text-sm font-semibold text-[#f3f4f6]">AI Assistant</h3>
        <span className="ml-auto rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#a855f7]">
          beta
        </span>
      </div>

      {!proposal && (
        <>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder="Describe the market you want to create — e.g. 'Will SOL close above $280 by end of week?' or 'Make a market on whether Bitcoin hits $150k this month'."
            className="w-full resize-none rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#a855f7] focus:outline-none"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                disabled={thinking}
                className="rounded-full border border-[#262d39] bg-[#0b0e12] px-2.5 py-1 text-[11px] text-[#9aa5b1] hover:border-[#a855f7]/40 hover:text-[#f3f4f6] disabled:opacity-50 transition-colors"
              >
                {truncate(ex, 50)}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#ef4444]">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <button
            onClick={() => propose(instruction)}
            disabled={thinking || !instruction.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#a855f7] py-2.5 text-sm font-bold text-[#151a21] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {thinking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Propose
              </>
            )}
          </button>
        </>
      )}

      {proposal && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full bg-[#262d39] px-2 py-0.5 text-[#9aa5b1]">
              {proposal.category}
            </span>
            {proposal.crypto && (
              <span className="rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-2 py-0.5 text-[#a855f7]">
                {COIN_BY_ID[proposal.crypto.coin].symbol} {formatUsd(proposal.crypto.startUsd)} → {formatUsd(proposal.crypto.targetUsd)}
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b7280]">Question</label>
            <input
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b7280]">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] placeholder-[#363d4b] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b7280]">Resolves in (days)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={editDays}
              onChange={(e) => setEditDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-sm text-[#f3f4f6] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#ef4444]">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={confirm}
              disabled={submitting || !editQuestion.trim() || !editDescription.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#a855f7] py-2.5 text-sm font-bold text-[#151a21] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Confirm & Create
                </>
              )}
            </button>
            <button
              onClick={() => propose(instruction)}
              disabled={thinking || submitting}
              className="flex items-center gap-1.5 rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-xs text-[#9aa5b1] hover:border-[#363d4b] hover:text-[#f3f4f6] disabled:opacity-50 transition-colors"
            >
              {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </button>
            <button
              onClick={() => {
                setProposal(null);
                setError(null);
              }}
              disabled={submitting}
              className="rounded-xl border border-[#262d39] bg-[#0b0e12] px-3 py-2.5 text-xs text-[#6b7280] hover:text-[#9aa5b1] disabled:opacity-50 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────
function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function coinImage(id: import("@/lib/coingecko").CoinId): string {
  const map: Record<string, string> = {
    bitcoin: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    ethereum: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    solana: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    ripple: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    binancecoin: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  };
  return map[id] ?? "";
}
