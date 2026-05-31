"use client";
import { useMemo, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import {
  useMarketData,
  useUserShares,
  usePreviewPayout,
  usePreviewBuy,
  usePreviewSell,
} from "@/hooks/useMarkets";
import { useBet } from "@/hooks/useBet";
import {
  formatUSDC,
  parseUSDC,
  timeLeft,
  seededSparkline,
  shortenAddress,
} from "@/lib/utils";
import { PLATFORM_FEE_BPS, USDC_DECIMALS } from "@/lib/constants";
import { BetSide } from "@/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { parseCryptoDescription, CRYPTO_MARKET_TAG } from "@/lib/cryptoMarkets";
import { COIN_BY_ID, formatUsd } from "@/lib/coingecko";
import { usePrices } from "@/components/PriceProvider";
import NetworkGate, { useChainGate } from "@/components/NetworkGate";
import TxBanner from "@/components/TxBanner";
import CoinIcon from "@/components/ui/CoinIcon";
import CatBadge from "@/components/ui/CatBadge";
import OddsBar from "@/components/ui/OddsBar";
import StatStrip, { StatStripItem } from "@/components/ui/StatStrip";
import PriceChart from "@/components/ui/PriceChart";
import { arcTestnet } from "@/lib/chains";

interface Props {
  params: Promise<{ address: string }>;
}

type Tab = "about" | "rules" | "activity" | "holders";
type Mode = "buy" | "sell";

export default function MarketPage({ params }: Props) {
  const { address: marketAddress } = use(params);
  const { address: userAddress } = useAccount();

  const addr = marketAddress as `0x${string}`;
  const { market, yesOdds, noOdds, totalPool, isLoading, refetch } = useMarketData(addr);
  const { data: shares } = useUserShares(addr, userAddress);
  const { data: payout } = usePreviewPayout(addr, userAddress);
  const {
    buy,
    sell,
    claimWinnings,
    isLoading: isActing,
    step,
    usdcBalance,
    balanceLoading,
    error: txError,
    clearError,
  } = useBet(addr);
  const { wrongChain, isConnected } = useChainGate();
  const writesDisabled = !isConnected || wrongChain;

  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "sell" ? "sell" : "buy";
  const [tab, setTab] = useState<Tab>("about");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [side, setSide] = useState<BetSide>("YES");
  const [amount, setAmount] = useState("");      // USDC input (buy mode)
  const [sharesAmt, setSharesAmt] = useState(""); // shares input (sell mode)

  const { prices } = usePrices();

  const yPct = useMemo(() => (yesOdds ? Number(yesOdds) / 1e16 : 50), [yesOdds]);
  const nPct = useMemo(() => (noOdds ? Number(noOdds) / 1e16 : 50), [noOdds]);

  const sparkline = useMemo(() => seededSparkline(addr, 96, yPct), [addr, yPct]);

  // Live buy preview (shares) and sell preview (gross USDC pre-fee).
  const buyAmountBig = useMemo(() => {
    try {
      if (!amount || parseFloat(amount) <= 0) return undefined;
      return parseUSDC(amount);
    } catch {
      return undefined;
    }
  }, [amount]);
  const sellSharesBig = useMemo(() => {
    try {
      if (!sharesAmt || parseFloat(sharesAmt) <= 0) return undefined;
      return parseUSDC(sharesAmt);
    } catch {
      return undefined;
    }
  }, [sharesAmt]);

  const { data: previewBuyShares } = usePreviewBuy(addr, side === "YES", buyAmountBig);
  const { data: previewSellGross } = usePreviewSell(addr, side === "YES", sellSharesBig);

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
          ← Back to markets
        </Link>
      </div>
    );
  }

  const userYes = shares ? (shares as [bigint, bigint])[0] : 0n;
  const userNo  = shares ? (shares as [bigint, bigint])[1] : 0n;
  const hasPosition = userYes > 0n || userNo > 0n;
  const userSideShares = side === "YES" ? userYes : userNo;

  const cryptoMeta = parseCryptoDescription(market.description);
  const coin = cryptoMeta ? COIN_BY_ID[cryptoMeta.coin] : null;
  const livePrice = cryptoMeta ? prices?.[cryptoMeta.coin]?.usd : undefined;
  const trackingYes =
    cryptoMeta && livePrice !== undefined ? livePrice > cryptoMeta.targetUsd : null;

  const humanDescription = (() => {
    const idx = market.description.lastIndexOf(CRYPTO_MARKET_TAG);
    return idx >= 0 ? market.description.slice(0, idx).trim() : market.description;
  })();

  // Buy breakdown
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = (amountNum * PLATFORM_FEE_BPS) / 10000;
  const previewSharesNum = previewBuyShares ? Number(previewBuyShares as bigint) / 1e6 : 0;
  const avgPriceBuy = previewSharesNum > 0 ? (amountNum - feeAmount) / previewSharesNum : 0;
  const potentialPayoutBuy = previewSharesNum; // 1 USDC per winning share
  const potentialProfitBuy = potentialPayoutBuy - amountNum;

  // Sell breakdown
  const sharesNum = parseFloat(sharesAmt) || 0;
  const grossSell = previewSellGross ? Number(previewSellGross as bigint) / 1e6 : 0;
  const sellFee   = grossSell * (PLATFORM_FEE_BPS / 10000);
  const netSell   = grossSell - sellFee;
  const sellAvgPrice = sharesNum > 0 ? netSell / sharesNum : 0;

  const balanceFormatted =
    usdcBalance !== undefined
      ? (Number(usdcBalance) / 10 ** USDC_DECIMALS).toFixed(2)
      : null;

  const stepLabel: Record<string, string> = {
    idle: mode === "buy" ? `Buy ${side}` : `Sell ${side}`,
    approving: "Approving USDC…",
    buying: "Confirming…",
    selling: "Confirming…",
    done: "Done",
  };

  const sideColor = side === "YES" ? "#22c55e" : "#ef4444";

  const outcomeColor = {
    UNRESOLVED: "#8b96a5",
    YES: "#22c55e",
    NO: "#ef4444",
    CANCELLED: "#8b96a5",
  }[market.outcome];

  const explorerBase = arcTestnet.blockExplorers?.default.url;
  const shortId = addr.slice(2, 6).toUpperCase();

  async function handleBuySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) return;
    await buy(side, amount, previewBuyShares as bigint | undefined);
    setAmount("");
    refetch();
  }

  async function handleSellSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellSharesBig) return;
    if (sellSharesBig > userSideShares) return;
    await sell(side, sellSharesBig, previewSellGross as bigint | undefined);
    setSharesAmt("");
    refetch();
  }

  return (
    <div className="bg-[#0b0e12]">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-8 py-[14px] border-b border-[#1f2630] flex items-center gap-[10px] text-[12px]">
        <Link href="/" className="text-[#8b96a5] hover:text-[#f3f4f6] flex items-center gap-1.5 transition-colors">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2 L2 5 L6 8" />
          </svg>
          Markets
        </Link>
        <span className="text-[#2a3340]">/</span>
        <span className="mono label text-[#8b96a5]">{market.category}</span>
        <span className="text-[#2a3340]">/</span>
        <span className="mono text-[11px] text-[#f3f4f6]">{shortId}</span>
      </div>

      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-3 sm:gap-[18px] min-w-0">
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="shrink-0">
              <CoinIcon market={market} size={56} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 items-center mb-[8px] flex-wrap">
                <CatBadge label={market.category || "Market"} />
                <span className="mono label text-[#6b7280]">ID · {shortId}</span>
                <span className="mono label text-[#6b7280] hidden sm:inline">· {shortenAddress(addr)}</span>
              </div>
              <h1
                className="m-0 text-[18px] sm:text-[24px] font-semibold text-[#f3f4f6] leading-[1.25] break-words"
                style={{ letterSpacing: "-0.5px", textWrap: "balance" }}
              >
                {market.question}
              </h1>
            </div>
          </div>

          <div className="-mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar [&>*]:min-w-[560px] sm:[&>*]:min-w-0">
          <StatStrip>
            <StatStripItem label="Chance" value={`${yPct.toFixed(0)}%`} sub="Implied YES" />
            <StatStripItem
              label="Pool liquidity"
              value={totalPool ? formatUSDC(totalPool) : "$0.00"}
              sub={`Seed ${formatUSDC(market.seedLiquidity)}`}
            />
            <StatStripItem
              label="Reserves"
              value={`${formatUSDC(market.yesReserve)} / ${formatUSDC(market.noReserve)}`}
              sub="YES / NO"
            />
            <StatStripItem
              label="Status"
              value={
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      background: market.resolved ? outcomeColor : "#22c55e",
                      boxShadow: market.resolved ? "none" : "0 0 6px #22c55e",
                    }}
                  />
                  <span className="text-[13px]">
                    {market.resolved ? market.outcome : "OPEN"}
                  </span>
                </span>
              }
              sub={market.resolved ? "Resolved" : `Ends ${timeLeft(market.resolutionTime)}`}
              last
            />
          </StatStrip>
          </div>

          <div className="border border-[#1f2630] rounded-[12px] bg-[#131820] p-3 sm:p-5 min-w-0 overflow-hidden shadow-[var(--shadow-card)]">
            <div className="flex justify-between items-baseline mb-[12px] gap-2 flex-wrap">
              <div>
                <div className="label mb-1">YES / NO odds</div>
                <div className="mono text-[11px] text-[#8b96a5]">FPMM spot · re-priced per trade</div>
              </div>
              <div className="mono text-[11px] text-[#8b96a5] whitespace-nowrap">
                Pool {totalPool ? formatUSDC(totalPool) : "$0.00"}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-[14px] mb-2">
              <span className="mono text-[12px] sm:text-[13px] text-[#22c55e] font-semibold min-w-[44px] sm:min-w-[52px]">
                YES {yPct.toFixed(0)}¢
              </span>
              <div className="flex-1 min-w-0">
                <OddsBar yes={yPct} height={10} />
              </div>
              <span className="mono text-[12px] sm:text-[13px] text-[#ef4444] font-semibold text-right min-w-[44px] sm:min-w-[52px]">
                NO {nPct.toFixed(0)}¢
              </span>
            </div>
            <PriceChart data={sparkline} color={sparkline[sparkline.length - 1] >= sparkline[0] ? "#22c55e" : "#ef4444"} />
          </div>

          {cryptoMeta && coin && (
            <PriceVsTarget
              coin={coin}
              cryptoMeta={cryptoMeta}
              livePrice={livePrice}
              trackingYes={trackingYes}
            />
          )}

          <div className="border border-[#1f2630] rounded-[12px] bg-[#131820] overflow-hidden shadow-[var(--shadow-card)]">
            <div className="flex border-b border-[#1f2630] px-2 overflow-x-auto no-scrollbar">
              {(
                [
                  { k: "about" as Tab, label: "About" },
                  { k: "rules" as Tab, label: "Rules & Oracle" },
                  { k: "activity" as Tab, label: "Activity" },
                  { k: "holders" as Tab, label: "Holders" },
                ]
              ).map((t) => {
                const active = tab === t.k;
                return (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className="bg-transparent border-none px-[14px] py-[13px] text-[12px] font-medium cursor-pointer transition-colors whitespace-nowrap -mb-px hover:text-[#f3f4f6]"
                    style={{
                      color: active ? "#f3f4f6" : "#8b96a5",
                      borderBottom: `1.5px solid ${active ? "#2d9cdb" : "transparent"}`,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="p-5 text-[13px] leading-[1.6] text-[#8b96a5]">
              {tab === "about" && (
                <>
                  <p className="m-0 mb-3 whitespace-pre-wrap">
                    {humanDescription || <span className="text-[#3a4250]">No description.</span>}
                  </p>
                  <div className="flex flex-wrap gap-[18px] pt-[16px] border-t border-[#1f2630]">
                    <div>
                      <div className="label mb-1">Market address</div>
                      <a
                        href={explorerBase ? `${explorerBase}/address/${addr}` : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="mono text-[12px] text-[#2d9cdb] hover:underline"
                      >
                        {shortenAddress(addr)} ↗
                      </a>
                    </div>
                    <div>
                      <div className="label mb-1">Resolves</div>
                      <div className="mono text-[12px] text-[#f3f4f6]">
                        {new Date(market.resolutionTime * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="label mb-1">Category</div>
                      <div className="mono text-[12px] text-[#f3f4f6]">{market.category}</div>
                    </div>
                    <div>
                      <div className="label mb-1">LP seed</div>
                      <div className="mono text-[12px] text-[#f3f4f6]">{formatUSDC(market.seedLiquidity)}</div>
                    </div>
                  </div>
                </>
              )}
              {tab === "rules" && (
                <>
                  <p className="m-0 mb-3 text-[#f3f4f6] font-medium">Market mechanics</p>
                  <p className="m-0 mb-4">
                    This is an FPMM (Polymarket-style) market. You can buy YES or NO shares at
                    any time, and sell them back into the pool before resolution at the current
                    AMM price. Each winning share redeems for exactly <span className="mono text-[#f3f4f6]">1 USDC</span> at resolution.
                  </p>
                  <p className="m-0 mb-3 text-[#f3f4f6] font-medium">Resolution source</p>
                  <p className="m-0 mb-4">
                    {cryptoMeta
                      ? `Resolves YES if ${coin?.name} (${coin?.symbol}) trades above ${formatUsd(cryptoMeta.targetUsd)} on CoinGecko at resolution time.`
                      : "This market resolves based on the configured source of truth at the scheduled end time."}
                  </p>
                  <p className="m-0 mb-3 text-[#f3f4f6] font-medium">Fees</p>
                  <p className="m-0 mb-4">
                    A <span className="mono text-[#f3f4f6]">{(PLATFORM_FEE_BPS / 100).toFixed(2)}%</span> protocol fee is charged on both buys and sells, routed on-chain to the treasury.
                  </p>
                  <p className="m-0 mb-3 text-[#f3f4f6] font-medium">Cancellation</p>
                  <p className="m-0">
                    If cancelled, all bettor shares refund 1:1 via <span className="mono text-[#f3f4f6]">claimWinnings</span>.
                  </p>
                </>
              )}
              {tab === "activity" && (
                <div className="py-10 text-center">
                  <div className="text-[13px] text-[#8b96a5]">Activity is indexed off-chain.</div>
                  <div className="mono label text-[#6b7280] mt-2">Coming soon</div>
                </div>
              )}
              {tab === "holders" && (
                <div className="py-10 text-center">
                  <div className="text-[13px] text-[#8b96a5]">Holders view</div>
                  <div className="mono label text-[#6b7280] mt-2">Coming soon</div>
                </div>
              )}
            </div>
          </div>
          <div className="h-[40px]" />
        </div>

        {/* RIGHT COLUMN — sticky bet card */}
        <div className="lg:sticky lg:top-[118px] min-w-0">
          <div className="border border-[#1f2630] rounded-[12px] bg-[#131820] p-3 sm:p-5 shadow-[var(--shadow-card)]">
            {!market.resolved ? (
              <>
                {(!isConnected || wrongChain) && (
                  <div className="mb-3">
                    <NetworkGate compact />
                  </div>
                )}

                {/* Buy / Sell mode toggle */}
                <div className="flex items-center justify-between mb-[16px]">
                  <div className="flex gap-[3px] p-[3px] rounded-[8px] border border-[#1f2630] bg-[#0b0e12]">
                    {(["buy", "sell"] as Mode[]).map((m) => {
                      const active = mode === m;
                      const disabled = m === "sell" && !hasPosition;
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={disabled}
                          onClick={() => setMode(m)}
                          className="px-[14px] py-[8px] sm:py-[6px] rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.08em] cursor-pointer transition-all duration-150 ease-out min-h-[36px] sm:min-h-0"
                          style={{
                            background: active ? "#1f2630" : "transparent",
                            color: active ? "#f3f4f6" : disabled ? "#3a4250" : "#8b96a5",
                            cursor: disabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mono text-[10px] text-[#6b7280]">FPMM · MARKET</div>
                </div>

                {/* Side toggle */}
                <div className="grid grid-cols-2 gap-2.5 mb-[16px]">
                  {(["YES", "NO"] as BetSide[]).map((s) => {
                    const active = side === s;
                    const col = s === "YES" ? "#22c55e" : "#ef4444";
                    const p = s === "YES" ? yPct : nPct;
                    const userSideHolding = s === "YES" ? userYes : userNo;
                    const sellDisabled = mode === "sell" && userSideHolding === 0n;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={sellDisabled}
                        onClick={() => !sellDisabled && setSide(s)}
                        className="px-3.5 py-[14px] rounded-[8px] text-left transition-all duration-150 ease-out"
                        style={{
                          border: `1px solid ${active ? col : "#1f2630"}`,
                          background: active
                            ? s === "YES"
                              ? "rgba(34,197,94,0.14)"
                              : "rgba(239,68,68,0.14)"
                            : "#0b0e12",
                          color: active ? col : sellDisabled ? "#3a4250" : "#f3f4f6",
                          cursor: sellDisabled ? "not-allowed" : "pointer",
                          boxShadow: active ? `0 4px 16px -10px ${col}` : "none",
                        }}
                      >
                        <div className="text-[11px] tracking-[0.14em] font-semibold mb-1">{s}</div>
                        <div className="mono text-[18px] font-semibold tracking-[-0.4px]">
                          {p.toFixed(0)}¢
                        </div>
                        {mode === "sell" && (
                          <div className="mono text-[10px] text-[#8b96a5] mt-1">
                            You hold {formatUSDC(userSideHolding)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {mode === "buy" ? (
                  <form onSubmit={handleBuySubmit}>
                    <div className="mb-[10px]">
                      <div className="flex justify-between mb-[6px]">
                        <span className="label">Amount</span>
                        <span className="mono text-[11px] text-[#8b96a5]">
                          Bal{" "}
                          {balanceLoading || balanceFormatted === null ? (
                            <span className="skeleton inline-block h-3 w-12 rounded-sm" />
                          ) : (
                            `${balanceFormatted} USDC`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 border border-[#1f2630] bg-[#0b0e12] rounded-[8px] px-3.5 py-[11px] transition-colors focus-within:border-[#2a3340]">
                        <span className="mono text-[14px] text-[#8b96a5]">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          disabled={writesDisabled}
                          className="mono flex-1 bg-transparent border-none outline-none text-[#f3f4f6] text-[20px] sm:text-[22px] font-semibold tracking-[-0.3px] w-0 min-w-0 truncate"
                        />
                        <span className="mono text-[12px] text-[#8b96a5]">USDC</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-[18px]">
                      {["10", "50", "100", "MAX"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={v === "MAX" && (balanceLoading || balanceFormatted === null)}
                          onClick={() => setAmount(v === "MAX" ? (balanceFormatted ?? "") : v)}
                          className="mono bg-[#0b0e12] border border-[#1f2630] text-[#8b96a5] py-[12px] sm:py-[7px] rounded-[8px] cursor-pointer text-[12px] sm:text-[11px] tracking-[0.04em] hover:text-[#f3f4f6] hover:border-[#2a3340] hover:bg-[#161d28] disabled:opacity-40 transition-all duration-150 ease-out min-h-[44px] sm:min-h-0"
                        >
                          {v === "MAX" ? "MAX" : `$${v}`}
                        </button>
                      ))}
                    </div>

                    {txError && (
                      <div className="mb-3">
                        <TxBanner message={txError} onDismiss={clearError} />
                      </div>
                    )}

                    <div className="border border-[#1f2630] rounded-[8px] bg-[#0b0e12] p-[14px] mb-[16px]">
                      <Row
                        label="Avg price"
                        value={avgPriceBuy > 0 ? `${(avgPriceBuy * 100).toFixed(1)}¢` : "—"}
                      />
                      <Row
                        label="Shares"
                        value={previewSharesNum > 0 ? previewSharesNum.toFixed(2) : "—"}
                      />
                      <Row
                        label="Max payout"
                        value={potentialPayoutBuy > 0 ? `$${potentialPayoutBuy.toFixed(2)}` : "—"}
                        color={sideColor}
                      />
                      <Row
                        label="Max profit"
                        value={
                          amountNum > 0
                            ? `${potentialProfitBuy >= 0 ? "+" : ""}$${potentialProfitBuy.toFixed(2)}`
                            : "—"
                        }
                        color={potentialProfitBuy >= 0 ? "#22c55e" : "#ef4444"}
                      />
                      <div className="h-px bg-[#1f2630] my-[6px]" />
                      <Row
                        label={`Protocol fee (${(PLATFORM_FEE_BPS / 100).toFixed(2)}%)`}
                        value={`$${feeAmount.toFixed(2)}`}
                        small
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!userAddress || isActing || !amountNum || writesDisabled}
                      className="w-full py-[15px] sm:py-[13px] px-4 rounded-[8px] border-none cursor-pointer font-bold text-[13px] tracking-[0.1em] uppercase transition-all duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                      style={{
                        background: sideColor,
                        color: "#0b0e12",
                        boxShadow: `0 6px 24px -8px ${sideColor}`,
                      }}
                    >
                      {isActing ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {stepLabel[step]}
                        </span>
                      ) : !userAddress ? "Connect wallet"
                        : wrongChain ? "Switch network"
                        : `Buy ${side} · $${amountNum.toFixed(2)}`}
                    </button>
                  </form>
                ) : (
                  /* Sell form */
                  <form onSubmit={handleSellSubmit}>
                    <div className="mb-[10px]">
                      <div className="flex justify-between mb-[6px]">
                        <span className="label">Shares to sell</span>
                        <span className="mono text-[11px] text-[#8b96a5]">
                          Holding {formatUSDC(userSideShares)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 border border-[#1f2630] bg-[#0b0e12] rounded-[8px] px-3.5 py-[11px] transition-colors focus-within:border-[#2a3340]">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={sharesAmt}
                          onChange={(e) => setSharesAmt(e.target.value)}
                          placeholder="0"
                          disabled={writesDisabled}
                          className="mono flex-1 bg-transparent border-none outline-none text-[#f3f4f6] text-[20px] sm:text-[22px] font-semibold tracking-[-0.3px] w-0 min-w-0 truncate"
                        />
                        <span className="mono text-[12px] text-[#8b96a5]">{side}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-[18px]">
                      {["25", "50", "75", "MAX"].map((v) => {
                        const pctVal = v === "MAX" ? 100 : parseInt(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            disabled={userSideShares === 0n}
                            onClick={() => {
                              const val = (userSideShares * BigInt(pctVal)) / 100n;
                              setSharesAmt((Number(val) / 1e6).toFixed(6));
                            }}
                            className="mono bg-[#0b0e12] border border-[#1f2630] text-[#8b96a5] py-[12px] sm:py-[7px] rounded-[8px] cursor-pointer text-[12px] sm:text-[11px] tracking-[0.04em] hover:text-[#f3f4f6] hover:border-[#2a3340] hover:bg-[#161d28] disabled:opacity-40 transition-all duration-150 ease-out min-h-[44px] sm:min-h-0"
                          >
                            {v === "MAX" ? "MAX" : `${v}%`}
                          </button>
                        );
                      })}
                    </div>

                    {txError && (
                      <div className="mb-3">
                        <TxBanner message={txError} onDismiss={clearError} />
                      </div>
                    )}

                    <div className="border border-[#1f2630] rounded-[8px] bg-[#0b0e12] p-[14px] mb-[16px]">
                      <Row
                        label="Avg price"
                        value={sellAvgPrice > 0 ? `${(sellAvgPrice * 100).toFixed(1)}¢` : "—"}
                      />
                      <Row
                        label="Gross USDC"
                        value={grossSell > 0 ? `$${grossSell.toFixed(2)}` : "—"}
                      />
                      <Row
                        label="You receive"
                        value={netSell > 0 ? `$${netSell.toFixed(2)}` : "—"}
                        color={sideColor}
                      />
                      <div className="h-px bg-[#1f2630] my-[6px]" />
                      <Row
                        label={`Protocol fee (${(PLATFORM_FEE_BPS / 100).toFixed(2)}%)`}
                        value={`$${sellFee.toFixed(2)}`}
                        small
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !userAddress ||
                        isActing ||
                        !sellSharesBig ||
                        (sellSharesBig && sellSharesBig > userSideShares) ||
                        writesDisabled
                      }
                      className="w-full py-[15px] sm:py-[13px] px-4 rounded-[8px] border-none cursor-pointer font-bold text-[13px] tracking-[0.1em] uppercase transition-all duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                      style={{
                        background: sideColor,
                        color: "#0b0e12",
                        boxShadow: `0 6px 24px -8px ${sideColor}`,
                      }}
                    >
                      {isActing ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {stepLabel[step]}
                        </span>
                      ) : !userAddress ? "Connect wallet"
                        : wrongChain ? "Switch network"
                        : sellSharesBig && sellSharesBig > userSideShares ? "Exceeds holdings"
                        : netSell > 0 ? `Sell ${side} · $${netSell.toFixed(2)}`
                        : "Enter shares"}
                    </button>
                  </form>
                )}

                <div className="mono text-[10px] text-[#6b7280] text-center mt-[10px] tracking-[0.08em]">
                  Settled on Arc Testnet · USDC · FPMM
                </div>
              </>
            ) : (
              <div>
                <div className="label mb-2">Resolved</div>
                <div className="text-[18px] font-semibold" style={{ color: outcomeColor }}>
                  {market.outcome === "CANCELLED" ? "Cancelled" : `${market.outcome} won`}
                </div>
                {hasPosition && payout && payout > 0n ? (
                  <button
                    onClick={async () => {
                      await claimWinnings();
                      refetch();
                    }}
                    disabled={isActing}
                    className="mt-3 w-full py-[15px] sm:py-[13px] px-4 rounded-[8px] border-none cursor-pointer font-bold text-[13px] tracking-[0.1em] uppercase transition-all duration-150 ease-out disabled:opacity-40 min-h-[48px]"
                    style={{ background: "#22c55e", color: "#0b0e12", boxShadow: "0 6px 24px -8px #22c55e" }}
                  >
                    {isActing ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : `Claim ${formatUSDC(payout)}`}
                  </button>
                ) : (
                  <p className="mt-2 text-[12px] text-[#6b7280]">
                    No claimable winnings for this wallet.
                  </p>
                )}
              </div>
            )}
          </div>

          {hasPosition && (
            <div className="border border-[#1f2630] rounded-[12px] bg-[#131820] p-5 mt-4 shadow-[var(--shadow-card)]">
              <div className="label mb-[10px]">Your position</div>
              <div className="space-y-[6px]">
                {userYes > 0n && <Row label="YES shares" value={formatUSDC(userYes)} color="#22c55e" />}
                {userNo > 0n && <Row label="NO shares" value={formatUSDC(userNo)} color="#ef4444" />}
                {payout !== undefined && payout > 0n && (
                  <>
                    <div className="h-px bg-[#1f2630] my-[6px]" />
                    <Row label="Est. payout" value={formatUSDC(payout)} color="#2d9cdb" />
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

function Row({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="flex justify-between" style={{ padding: "5px 0", fontSize: small ? 11 : 12 }}>
      <span style={{ color: small ? "#6b7280" : "#8b96a5" }}>{label}</span>
      <span className="mono" style={{ color: color || (small ? "#6b7280" : "#f3f4f6") }}>
        {value}
      </span>
    </div>
  );
}

function PriceVsTarget({
  coin,
  cryptoMeta,
  livePrice,
  trackingYes,
}: {
  coin: { name: string; symbol: string };
  cryptoMeta: { startUsd: number; targetUsd: number };
  livePrice?: number;
  trackingYes: boolean | null;
}) {
  const price = livePrice ?? cryptoMeta.startUsd;
  const target = cryptoMeta.targetUsd;
  const pct = Math.min(100, Math.max(0, (price / target) * 100));
  const delta = ((price - cryptoMeta.startUsd) / cryptoMeta.startUsd) * 100;
  const requiredUp = ((target - price) / price) * 100;
  return (
    <div className="border border-[#1f2630] rounded-[12px] bg-[#131820] p-5 shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-baseline mb-[16px] flex-wrap gap-3">
        <div>
          <div className="label mb-1">Live · {coin.symbol} / USD</div>
          <div className="flex items-baseline gap-[10px]">
            <span
              className="mono text-[28px] font-semibold tracking-[-0.6px]"
              style={{
                color:
                  trackingYes === null ? "#f3f4f6" : trackingYes ? "#22c55e" : "#f3f4f6",
              }}
            >
              {livePrice !== undefined ? formatUsd(livePrice) : "—"}
            </span>
            {livePrice !== undefined && (
              <span
                className="mono text-[13px]"
                style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="label mb-1">Target</div>
          <div className="mono text-[16px] text-[#f3f4f6]">≥ {formatUsd(target)}</div>
          {livePrice !== undefined && requiredUp > 0 && (
            <div className="mono text-[11px] text-[#8b96a5] mt-[3px]">
              +{requiredUp.toFixed(1)}% required
            </div>
          )}
        </div>
      </div>
      <div className="relative h-[18px] bg-[#0b0e12] border border-[#1f2630] rounded-[6px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, rgba(45,156,219,0.1), rgba(45,156,219,0.5))",
            borderRight: "1px solid #2d9cdb",
          }}
        />
        <div
          className="absolute top-[-3px] bottom-[-3px] w-[2px]"
          style={{
            left: `${pct}%`,
            background: "#2d9cdb",
            boxShadow: "0 0 8px #2d9cdb",
          }}
        />
      </div>
      <div className="mono flex justify-between text-[10px] text-[#6b7280] mt-[6px]">
        <span>$0</span>
        <span>{formatUsd(target / 4)}</span>
        <span>{formatUsd(target / 2)}</span>
        <span>{formatUsd((target * 3) / 4)}</span>
        <span className="text-[#2d9cdb]">{formatUsd(target)} ◉</span>
      </div>
    </div>
  );
}
