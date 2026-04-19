"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { useBet } from "@/hooks/useBet";
import { PLATFORM_FEE_BPS, USDC_DECIMALS } from "@/lib/constants";
import { BetSide } from "@/types";

interface Props {
  marketAddress: `0x${string}`;
  question:      string;
  yesOdds?:      bigint;
  noOdds?:       bigint;
  onClose:       () => void;
}

export default function BetModal({ marketAddress, question, yesOdds, noOdds, onClose }: Props) {
  const { address } = useAccount();

  const [side, setSide]     = useState<BetSide>("YES");
  const [amount, setAmount] = useState("");

  const { bet, isLoading, step, usdcBalance } = useBet(marketAddress);

  const amountNum = parseFloat(amount) || 0;
  const feeAmount = (amountNum * PLATFORM_FEE_BPS) / 10000;
  const netBet    = amountNum - feeAmount;

  const odds = side === "YES" ? yesOdds : noOdds;
  const potentialPayout =
    odds && odds > 0n
      ? (netBet * Number(BigInt("1000000000000000000"))) / Number(odds)
      : 0;

  const balanceFormatted = usdcBalance
    ? (Number(usdcBalance) / 10 ** USDC_DECIMALS).toFixed(2)
    : "0.00";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return;
    await bet(side, amount);
  }

  const stepLabel: Record<string, string> = {
    idle:      `Buy ${side}`,
    approving: "Approving USDC…",
    betting:   "Confirming…",
    done:      "Done",
  };

  const yPct = yesOdds ? Number(yesOdds) / 1e16 : 50;
  const nPct = noOdds  ? Number(noOdds)  / 1e16 : 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-sm overflow-y-auto rounded-lg border border-[#1f2630] bg-[#131820] p-5 shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">Place bet</div>
            <p className="mt-1 line-clamp-2 text-[13px] font-medium text-[#f3f4f6]">
              {question}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#6b7280] hover:bg-[#0b0e12] hover:text-[#f3f4f6] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* YES / NO */}
          <div className="grid grid-cols-2 gap-2">
            {(["YES", "NO"] as BetSide[]).map((s) => {
              const pct = s === "YES" ? yPct : nPct;
              const active = side === s;
              const accent = s === "YES" ? "#22c55e" : "#ef4444";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className="rounded-md py-2.5 text-[13px] font-semibold transition-colors"
                  style={{
                    background: active ? accent : "#0b0e12",
                    color:      active ? "#0b0e12" : accent,
                    border:     active ? `1px solid ${accent}` : "1px solid #1f2630",
                  }}
                >
                  <div>{s}</div>
                  <div className="text-[11px] font-mono tabular mt-0.5 opacity-80">
                    {pct.toFixed(1)}%
                  </div>
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div>
            <div className="mb-1.5 flex justify-between text-[11px] text-[#6b7280]">
              <label>Amount (USDC)</label>
              <span className="tabular">Bal: {balanceFormatted}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-[#1f2630] bg-[#0b0e12] px-3 py-2.5 pr-16 text-[14px] font-mono tabular text-[#f3f4f6] placeholder-[#3a4250] focus:border-[#2d9cdb] focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                {["10", "50", "100"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="rounded px-1.5 py-0.5 text-[10.5px] text-[#6b7280] hover:bg-[#1f2630] hover:text-[#f3f4f6] transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {amountNum > 0 && (
            <div className="rounded-md border border-[#1f2630] bg-[#0b0e12] p-3 text-[12px] space-y-1.5">
              <div className="flex justify-between text-[#6b7280]">
                <span>Bet</span><span className="tabular font-mono">${amountNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6b7280]">
                <span>Fee ({(PLATFORM_FEE_BPS / 100).toFixed(2)}%)</span>
                <span className="tabular font-mono">−${feeAmount.toFixed(2)}</span>
              </div>
              <div className="h-px bg-[#1f2630]" />
              <div className="flex justify-between font-semibold text-[#f3f4f6]">
                <span>Net</span><span className="tabular font-mono">${netBet.toFixed(2)}</span>
              </div>
              <div
                className="flex justify-between font-semibold"
                style={{ color: side === "YES" ? "#22c55e" : "#ef4444" }}
              >
                <span>Payout if {side}</span>
                <span className="tabular font-mono">${potentialPayout.toFixed(2)}</span>
              </div>
            </div>
          )}

          {!address && (
            <div className="flex items-center gap-2 text-[11.5px] text-[#f59e0b]">
              <AlertCircle className="h-3.5 w-3.5" />
              Connect your wallet to place a bet
            </div>
          )}

          <button
            type="submit"
            disabled={!address || isLoading || !amountNum}
            className="w-full rounded-md py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: side === "YES" ? "#22c55e" : "#ef4444",
              color:      "#0b0e12",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {stepLabel[step]}
              </span>
            ) : (
              stepLabel[step]
            )}
          </button>

          <p className="text-center text-[10.5px] text-[#3a4250]">
            Settles on Arc Testnet · USDC at <span className="font-mono">0x3600…0000</span>
          </p>
        </form>
      </div>
    </div>
  );
}
