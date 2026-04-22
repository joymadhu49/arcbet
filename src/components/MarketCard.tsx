"use client";
import { memo, useMemo } from "react";
import Link from "next/link";
import { MarketData } from "@/types";
import { formatUSDC, timeLeft, seededSparkline } from "@/lib/utils";
import { parseCryptoDescription } from "@/lib/cryptoMarkets";
import { formatUsd } from "@/lib/coingecko";
import CoinIcon from "@/components/ui/CoinIcon";
import CatBadge from "@/components/ui/CatBadge";
import OddsBar from "@/components/ui/OddsBar";
import Sparkline from "@/components/ui/Sparkline";

interface Props {
  market: MarketData;
  yesOdds?: bigint;
  noOdds?: bigint;
  totalPool?: bigint;
  livePrice?: number;
}

function MarketCard({ market, yesOdds, totalPool, livePrice }: Props) {
  const yPct = yesOdds ? Number(yesOdds) / 1e16 : 50;
  const cryptoMeta = parseCryptoDescription(market.description);
  const trackingYes =
    cryptoMeta && livePrice !== undefined ? livePrice > cryptoMeta.targetUsd : null;

  const sparkline = useMemo(
    () => seededSparkline(market.address, 28, yPct),
    [market.address, yPct],
  );
  const trend = sparkline[sparkline.length - 1] > sparkline[0];
  const shortId = market.address.slice(2, 6).toUpperCase();

  const statusLabel = market.resolved
    ? market.outcome === "YES"
      ? { text: "Resolved · YES", color: "#22c55e" }
      : market.outcome === "NO"
        ? { text: "Resolved · NO", color: "#ef4444" }
        : { text: "Cancelled", color: "#8b96a5" }
    : null;

  return (
    <Link
      href={`/market/${market.address}`}
      className="block group"
    >
      <div
        className="flex flex-col gap-[14px] rounded-[4px] border border-[#1f2630] bg-[#131820] p-4 transition-colors hover:border-[#2a3340]"
      >
        <div className="flex items-start gap-3">
          <CoinIcon market={market} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 items-center mb-[6px]">
              <CatBadge label={market.category || "Market"} />
              <span className="mono label text-[#6b7280]">ID · {shortId}</span>
            </div>
            <div
              className="text-[14px] font-medium leading-[1.35] text-[#f3f4f6] line-clamp-2"
              style={{ textWrap: "pretty" }}
            >
              {market.question}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-[10px]">
          <div>
            <div className="label mb-[3px]">Yes chance</div>
            <div className="flex items-baseline gap-[6px]">
              <span className="mono text-[24px] font-semibold text-[#f3f4f6] tracking-[-0.5px]">
                {yPct.toFixed(0)}
              </span>
              <span className="mono text-[12px] text-[#8b96a5]">%</span>
            </div>
          </div>
          <Sparkline
            data={sparkline}
            width={86}
            height={28}
            color={trend ? "#22c55e" : "#ef4444"}
          />
        </div>

        <OddsBar yes={yPct} />

        {cryptoMeta && livePrice !== undefined && (
          <div className="flex items-center justify-between text-[11px] border-t border-dashed border-[#1f2630] pt-[8px] -mt-[4px]">
            <span className="text-[#6b7280]">
              Live <span className="mono text-[#f3f4f6]">{formatUsd(livePrice)}</span>
            </span>
            <span className="mono" style={{ color: trackingYes ? "#22c55e" : "#ef4444" }}>
              Target {formatUsd(cryptoMeta.targetUsd)}
            </span>
          </div>
        )}

        <div
          className="grid gap-2 pt-[10px] border-t border-dashed border-[#1f2630]"
          style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
        >
          <div>
            <div className="label">Vol</div>
            <div className="mono text-[12px] text-[#f3f4f6] mt-[2px]">
              {totalPool ? formatUSDC(totalPool) : "$0.00"}
            </div>
          </div>
          <div>
            <div className="label">Ends</div>
            <div className="mono text-[12px] text-[#f3f4f6] mt-[2px]">
              {statusLabel ? (
                <span style={{ color: statusLabel.color }}>{statusLabel.text}</span>
              ) : (
                timeLeft(market.resolutionTime)
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-transparent border border-[#2a3340] text-[#f3f4f6] px-3 py-[6px] rounded-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase group-hover:bg-[#1f2630] transition-colors">
              Trade →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default memo(
  MarketCard,
  (prev, next) =>
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
