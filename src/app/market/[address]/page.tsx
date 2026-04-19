"use client";
import { useMemo, useState } from "react";
import { use } from "react";
import { useAccount } from "wagmi";
import { useMarketData, useUserShares, usePreviewPayout } from "@/hooks/useMarkets";
import { useBet } from "@/hooks/useBet";
import { formatUSDC, timeLeft } from "@/lib/utils";
import { PLATFORM_FEE_BPS, USDC_DECIMALS } from "@/lib/constants";
import { BetSide } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { parseCryptoDescription, CRYPTO_MARKET_TAG } from "@/lib/cryptoMarkets";
import { COIN_BY_ID, formatUsd } from "@/lib/coingecko";
import { usePrices } from "@/components/PriceProvider";

interface Props {
  params: Promise<{ address: string }>;
}

type Tab = "about" | "rules" | "activity";

export default function MarketPage({ params }: Props) {
  const { address: marketAddress } = use(params);
  const { address: userAddress } = useAccount();

  const addr = marketAddress as `0x${string}`;
  const { market, yesOdds, noOdds, totalPool, isLoading, refetch } = useMarketData(addr);
  const { data: shares } = useUserShares(addr, userAddress);
  const { data: payout } = usePreviewPayout(addr, userAddress);
  const { bet, claimWinnings, isLoading: isActing, step, usdcBalance } = useBet(addr);

  const [tab, setTab] = useState<Tab>("about");
  const [side, setSide] = useState<BetSide>("YES");
  const [amount, setAmount] = useState("");

  const { prices } = usePrices();

  const yPct = useMemo(() => (yesOdds ? Number(yesOdds) / 1e16 : 50), [yesOdds]);
  const nPct = useMemo(() => (noOdds  ? Number(noOdds)  / 1e16 : 50), [noOdds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-[#8b96a5]" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-[13px] text-[#ef4444]">Market not found.</p>
        <Link href="/" className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-[#2d9cdb] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to markets
        </Link>
      </div>
    );
  }

  const userYes = shares ? (shares as [bigint, bigint])[0] : 0n;
  const userNo  = shares ? (shares as [bigint, bigint])[1] : 0n;
  const hasPosition = userYes > 0n || userNo > 0n;

  // Crypto context
  const cryptoMeta = parseCryptoDescription(market.description);
  const coin = cryptoMeta ? COIN_BY_ID[cryptoMeta.coin] : null;
  const livePrice = cryptoMeta ? prices?.[cryptoMeta.coin]?.usd : undefined;
  const trackingYes = cryptoMeta && livePrice !== undefined ? livePrice > cryptoMeta.targetUsd : null;

  const humanDescription = (() => {
    const idx = market.description.lastIndexOf(CRYPTO_MARKET_TAG);
    return idx >= 0 ? market.description.slice(0, idx).trim() : market.description;
  })();

  // Bet-card math
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = (amountNum * PLATFORM_FEE_BPS) / 10000;
  const netBet    = amountNum - feeAmount;
  const sideOdds  = side === "YES" ? yesOdds : noOdds;
  const potentialPayout =
    sideOdds && sideOdds > 0n
      ? (netBet * Number(BigInt("1000000000000000000"))) / Number(sideOdds)
      : 0;
  const balanceFormatted = usdcBalance
    ? (Number(usdcBalance) / 10 ** USDC_DECIMALS).toFixed(2)
    : "0.00";

  const stepLabel: Record<string, string> = {
    idle:      `Buy ${side}`,
    approving: "Approving USDC…",
    betting:   "Confirming…",
    done:      "Done",
  };

  const outcomeColor = {
    UNRESOLVED: "#8b96a5",
    YES:        "#22c55e",
    NO:         "#ef4444",
    CANCELLED:  "#8b96a5",
  }[market.outcome];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return;
    await bet(side, amount);
    refetch();
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12.5px] text-[#8b96a5] hover:text-[#f3f4f6] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Markets
      </Link>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-4 min-w-0">
          {/* Header block: thumb + question + primary stats */}
          <div className="rounded-lg border border-[#1f2630] bg-[#131820] p-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#0b0e12] ring-1 ring-[#1f2630]">
                {market.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={market.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : coin ? (
                  <div
                    className="flex h-full w-full items-center justify-center text-lg font-bold"
                    style={{ background: `${coin.color}22`, color: coin.color }}
                  >
                    {coin.symbol[0]}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#3a4250]">
                    {market.category.slice(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-[#6b7280]">
                  <span>{market.category}</span>
                  <span>·</span>
                  <span className="font-mono">{addr.slice(0, 6)}…{addr.slice(-4)}</span>
                </div>
                <h1 className="mt-1 text-[18px] sm:text-[20px] font-semibold leading-snug text-[#f3f4f6]">
                  {market.question}
                </h1>
              </div>
            </div>

            {/* Stat strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-0 rounded-md border border-[#1f2630] overflow-hidden">
              <Stat label="Chance" value={`${yPct.toFixed(0)}%`} valueColor="#f3f4f6" />
              <Stat label="Volume" value={totalPool ? formatUSDC(totalPool) : "$0.00"} />
              <Stat label="Ends" value={timeLeft(market.resolutionTime)} />
              <Stat
                label="Status"
                value={market.resolved ? market.outcome : "Open"}
                valueColor={outcomeColor}
              />
            </div>

            {/* Odds split bar */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-[11px] text-[#6b7280] mb-1.5">
                <span className="text-[#22c55e] font-semibold tabular">
                  YES {yPct.toFixed(1)}%
                </span>
                <span className="text-[#ef4444] font-semibold tabular">
                  NO {nPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#ef4444]/25 overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] transition-all duration-500"
                  style={{ width: `${yPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-[11px] text-[#6b7280] tabular">
                <span>Pool: {market.totalYes ? formatUSDC(market.totalYes) : "$0"}</span>
                <span>Pool: {market.totalNo ? formatUSDC(market.totalNo) : "$0"}</span>
              </div>
            </div>
          </div>

          {/* Live price block (crypto markets only) */}
          {cryptoMeta && coin && (
            <div className="rounded-lg border border-[#1f2630] bg-[#131820] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#8b96a5]">
                  Live price vs target
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-live" />
                  CoinGecko
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 rounded-md border border-[#1f2630] overflow-hidden">
                <Stat label="Start" value={formatUsd(cryptoMeta.startUsd)} mono />
                <Stat label="Target" value={formatUsd(cryptoMeta.targetUsd)} valueColor="#f59e0b" mono />
                <Stat
                  label="Now"
                  value={livePrice !== undefined ? formatUsd(livePrice) : "—"}
                  valueColor={trackingYes === null ? "#8b96a5" : trackingYes ? "#22c55e" : "#ef4444"}
                  mono
                />
              </div>
              <p className="mt-3 text-[11px] text-[#6b7280]">
                Tracking <span className="text-[#f3f4f6]">{coin.name}</span> · Resolves at end of day on CoinGecko spot.
              </p>
            </div>
          )}

          {/* Tabs: About / Rules / Activity */}
          <div className="rounded-lg border border-[#1f2630] bg-[#131820]">
            <div className="flex items-center gap-6 border-b border-[#1f2630] px-5">
              {(["about", "rules", "activity"] as Tab[]).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative h-11 text-[12.5px] capitalize transition-colors ${
                      active ? "text-[#f3f4f6]" : "text-[#8b96a5] hover:text-[#f3f4f6]"
                    }`}
                  >
                    {t}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2d9cdb]" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-5 text-[13px] leading-relaxed text-[#8b96a5] whitespace-pre-wrap min-h-[80px]">
              {tab === "about" && (
                humanDescription || <span className="text-[#3a4250]">No description.</span>
              )}
              {tab === "rules" && (
                <div className="space-y-2">
                  <p>Market resolves at the scheduled end time based on the configured source of truth.</p>
                  <p>Crypto markets settle on CoinGecko spot price at the moment of resolution.</p>
                  <p>Winners split the losing pool pro-rata after a {(PLATFORM_FEE_BPS / 100).toFixed(2)}% platform fee.</p>
                  <p>If the market is cancelled, all stakes are refundable.</p>
                </div>
              )}
              {tab === "activity" && (
                <span className="text-[#3a4250]">Activity feed coming soon.</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — sticky bet card */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[#1f2630] bg-[#131820] sticky top-[9rem]">
            {!market.resolved ? (
              <form onSubmit={handleSubmit} className="p-4">
                {/* YES / NO toggle — flat, two-segment */}
                <div className="grid grid-cols-2 gap-2">
                  {(["YES", "NO"] as BetSide[]).map((s) => {
                    const active = side === s;
                    const pct = s === "YES" ? yPct : nPct;
                    const activeBg = s === "YES" ? "#22c55e" : "#ef4444";
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSide(s)}
                        className="rounded-md py-2.5 text-[13px] font-semibold transition-colors"
                        style={{
                          background: active ? activeBg : "#0b0e12",
                          color:      active ? "#0b0e12" : s === "YES" ? "#22c55e" : "#ef4444",
                          border:     active ? `1px solid ${activeBg}` : "1px solid #1f2630",
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
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-[#6b7280]">
                    <span>Amount</span>
                    <span className="tabular">Bal: {balanceFormatted} USDC</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-[#1f2630] bg-[#0b0e12] px-3 py-2.5 pr-14 text-[14px] font-mono tabular text-[#f3f4f6] placeholder-[#3a4250] focus:border-[#2d9cdb] focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#6b7280]">
                      USDC
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {["10", "50", "100", "Max"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setAmount(v === "Max" ? balanceFormatted : v)
                        }
                        className="rounded-md border border-[#1f2630] bg-[#0b0e12] py-1.5 text-[11px] text-[#8b96a5] hover:text-[#f3f4f6] hover:border-[#2a3340] transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 rounded-md border border-[#1f2630] bg-[#0b0e12] p-3 text-[12px] space-y-1.5">
                  <Row label="Bet" value={`$${amountNum.toFixed(2)}`} />
                  <Row label={`Fee (${(PLATFORM_FEE_BPS / 100).toFixed(2)}%)`} value={`−$${feeAmount.toFixed(2)}`} />
                  <div className="h-px bg-[#1f2630] my-1" />
                  <Row label="Net" value={`$${netBet.toFixed(2)}`} strong />
                  <Row
                    label={`Payout if ${side}`}
                    value={`$${potentialPayout.toFixed(2)}`}
                    strong
                    valueColor={side === "YES" ? "#22c55e" : "#ef4444"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!userAddress || isActing || !amountNum}
                  className="mt-3 w-full rounded-md py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: side === "YES" ? "#22c55e" : "#ef4444",
                    color:      "#0b0e12",
                  }}
                >
                  {isActing ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {stepLabel[step]}
                    </span>
                  ) : !userAddress ? (
                    "Connect wallet"
                  ) : (
                    stepLabel[step]
                  )}
                </button>

                <p className="mt-2 text-center text-[10.5px] text-[#3a4250]">
                  Settled on Arc Testnet · USDC
                </p>
              </form>
            ) : (
              <div className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">
                  Resolved
                </div>
                <div
                  className="mt-1 text-[18px] font-semibold"
                  style={{ color: outcomeColor }}
                >
                  {market.outcome === "CANCELLED" ? "Cancelled" : `${market.outcome} won`}
                </div>
                {hasPosition && payout && payout > 0n && (
                  <button
                    onClick={async () => { await claimWinnings(); refetch(); }}
                    disabled={isActing}
                    className="mt-3 w-full rounded-md bg-[#22c55e] py-2.5 text-[13px] font-semibold text-[#0b0e12] hover:bg-[#22c55e]/90 disabled:opacity-40 transition-colors"
                  >
                    {isActing ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                    ) : (
                      `Claim ${formatUSDC(payout)}`
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Position */}
          {hasPosition && (
            <div className="rounded-lg border border-[#1f2630] bg-[#131820] p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6b7280] mb-2.5">
                Your position
              </div>
              <div className="space-y-1.5 text-[12.5px]">
                {userYes > 0n && (
                  <Row label="YES shares" value={formatUSDC(userYes)} valueColor="#22c55e" />
                )}
                {userNo > 0n && (
                  <Row label="NO shares" value={formatUSDC(userNo)} valueColor="#ef4444" />
                )}
                {payout !== undefined && payout > 0n && (
                  <>
                    <div className="h-px bg-[#1f2630] my-1.5" />
                    <Row label="Est. payout" value={formatUSDC(payout)} strong valueColor="#2d9cdb" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 border-r border-[#1f2630] last:border-r-0 bg-[#0b0e12]">
      <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">{label}</div>
      <div
        className={`mt-0.5 text-[13px] font-semibold tabular ${mono ? "font-mono" : ""}`}
        style={{ color: valueColor ?? "#f3f4f6" }}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  valueColor,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6b7280]">{label}</span>
      <span
        className={`tabular font-mono ${strong ? "font-semibold" : ""}`}
        style={{ color: valueColor ?? (strong ? "#f3f4f6" : "#8b96a5") }}
      >
        {value}
      </span>
    </div>
  );
}
