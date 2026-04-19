"use client";
import { memo } from "react";
import Link from "next/link";
import { MarketData } from "@/types";
import { formatUSDC, timeLeft } from "@/lib/utils";
import { parseCryptoDescription } from "@/lib/cryptoMarkets";
import { COIN_BY_ID, formatUsd } from "@/lib/coingecko";

interface Props {
  market: MarketData;
  yesOdds?: bigint;
  noOdds?: bigint;
  totalPool?: bigint;
  /** Optional live USD price for crypto markets, keyed by coingecko id. */
  livePrice?: number;
}

function MarketCard({ market, yesOdds, noOdds, totalPool, livePrice }: Props) {
  const yPct = yesOdds ? Number(yesOdds) / 1e16 : 50;
  const nPct = noOdds  ? Number(noOdds)  / 1e16 : 50;

  const cryptoMeta = parseCryptoDescription(market.description);
  const coin = cryptoMeta ? COIN_BY_ID[cryptoMeta.coin] : null;
  const trackingYes = cryptoMeta && livePrice !== undefined
    ? livePrice > cryptoMeta.targetUsd
    : null;

  const statusLabel = market.resolved
    ? market.outcome === "YES"
      ? { text: "Resolved · YES", color: "#22c55e" }
      : market.outcome === "NO"
      ? { text: "Resolved · NO", color: "#ef4444" }
      : { text: "Cancelled", color: "#8b96a5" }
    : null;

  return (
    <Link href={`/market/${market.address}`} className="block">
      <div className="group h-full flex flex-col rounded-lg border border-[#1f2630] bg-[#131820] hover:border-[#2a3340] transition-colors">
        {/* Top: thumb + question + big chance */}
        <div className="flex items-start gap-3 p-4">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#0b0e12] ring-1 ring-[#1f2630]">
            {market.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={market.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : coin ? (
              <div
                className="flex h-full w-full items-center justify-center text-sm font-bold"
                style={{ background: `${coin.color}22`, color: coin.color }}
              >
                {coin.symbol[0]}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#3a4250]">
                {market.category.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium leading-snug text-[#f3f4f6] line-clamp-2">
              {market.question}
            </p>
            <div className="mt-1 text-[11px] text-[#6b7280]">
              {market.category}
            </div>
          </div>

          {/* Big chance % — primary data point */}
          <div className="shrink-0 text-right">
            <div className="text-[22px] font-bold leading-none text-[#f3f4f6] tabular">
              {yPct.toFixed(0)}%
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">
              chance
            </div>
          </div>
        </div>

        {/* Optional live-price strip (crypto markets) */}
        {cryptoMeta && (
          <div className="mx-4 mb-3 flex items-center justify-between rounded-md border border-[#1f2630] bg-[#0b0e12] px-2.5 py-1.5 text-[11px]">
            <span className="text-[#6b7280]">
              Target <span className="font-mono text-[#f3f4f6] tabular">{formatUsd(cryptoMeta.targetUsd)}</span>
            </span>
            {livePrice !== undefined ? (
              <span
                className="font-mono tabular"
                style={{ color: trackingYes ? "#22c55e" : "#ef4444" }}
              >
                {formatUsd(livePrice)}
              </span>
            ) : (
              <span className="font-mono text-[#3a4250]">—</span>
            )}
          </div>
        )}

        {/* Buy Yes / Buy No — small, secondary */}
        <div className="grid grid-cols-2 gap-2 px-4">
          <div className="rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 py-1.5 text-center text-[12px] font-semibold text-[#22c55e] group-hover:bg-[#22c55e]/15 transition-colors">
            Buy Yes
          </div>
          <div className="rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 py-1.5 text-center text-[12px] font-semibold text-[#ef4444] group-hover:bg-[#ef4444]/15 transition-colors">
            Buy No
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between px-4 pt-3 pb-3 text-[11px] text-[#6b7280]">
          <span className="tabular">
            {totalPool ? formatUSDC(totalPool) : "$0.00"} Vol
          </span>
          <span className="tabular">
            {statusLabel ? (
              <span style={{ color: statusLabel.color }}>{statusLabel.text}</span>
            ) : (
              timeLeft(market.resolutionTime)
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default memo(MarketCard, (prev, next) =>
  prev.market.address === next.market.address &&
  prev.market.resolved === next.market.resolved &&
  prev.market.outcome === next.market.outcome &&
  prev.market.resolutionTime === next.market.resolutionTime &&
  prev.market.question === next.market.question &&
  prev.market.imageUrl === next.market.imageUrl &&
  prev.yesOdds === next.yesOdds &&
  prev.noOdds === next.noOdds &&
  prev.totalPool === next.totalPool &&
  prev.livePrice === next.livePrice,
);
