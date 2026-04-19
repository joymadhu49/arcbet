"use client";
import { useAccount } from "wagmi";
import { useAllMarketAddresses, useMarketData, useUserShares, usePreviewPayout } from "@/hooks/useMarkets";
import { formatUSDC, timeLeft } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useBet } from "@/hooks/useBet";

function PositionRow({
  marketAddress,
  userAddress,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
}) {
  const { market } = useMarketData(marketAddress);
  const { data: shares } = useUserShares(marketAddress, userAddress);
  const { data: payout } = usePreviewPayout(marketAddress, userAddress);
  const { claimWinnings, isLoading } = useBet(marketAddress);

  const userYes = shares ? (shares as [bigint, bigint])[0] : 0n;
  const userNo  = shares ? (shares as [bigint, bigint])[1] : 0n;
  if (!market || (userYes === 0n && userNo === 0n)) return null;

  const side = userYes > 0n ? "YES" : "NO";
  const amount = userYes > 0n ? userYes : userNo;
  const sideColor = side === "YES" ? "#22c55e" : "#ef4444";

  const statusLabel = market.resolved ? market.outcome : "Open";
  const statusColor = market.resolved
    ? market.outcome === "YES"
      ? "#22c55e"
      : market.outcome === "NO"
      ? "#ef4444"
      : "#8b96a5"
    : "#f59e0b";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_80px_110px_120px_110px] gap-4 items-center border-b border-[#1f2630] px-4 py-3 hover:bg-[#131820]/50 transition-colors">
      {/* Question + meta */}
      <div className="min-w-0">
        <Link
          href={`/market/${marketAddress}`}
          className="block text-[13px] font-medium text-[#f3f4f6] hover:text-[#2d9cdb] transition-colors truncate"
        >
          {market.question}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6b7280]">
          <span>{market.category}</span>
          <span>·</span>
          <span>{timeLeft(market.resolutionTime)}</span>
        </div>
      </div>

      {/* Side */}
      <div className="text-[12px] font-semibold tabular" style={{ color: sideColor }}>
        {side}
      </div>

      {/* Shares */}
      <div className="text-[12.5px] font-mono tabular text-[#f3f4f6] text-right">
        {formatUSDC(amount)}
      </div>

      {/* Payout */}
      <div className="text-[12.5px] font-mono tabular text-right text-[#2d9cdb]">
        {payout ? formatUSDC(payout) : "—"}
      </div>

      {/* Status / action */}
      <div className="flex items-center justify-end gap-2 text-[11.5px]">
        {market.resolved && payout && payout > 0n ? (
          <button
            onClick={() => claimWinnings()}
            disabled={isLoading}
            className="rounded-md bg-[#22c55e] px-3 py-1.5 text-[11.5px] font-semibold text-[#0b0e12] hover:bg-[#22c55e]/90 disabled:opacity-40 transition-colors"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
          </button>
        ) : (
          <span style={{ color: statusColor }}>{statusLabel}</span>
        )}
      </div>
    </div>
  );
}

function PortfolioContent({ userAddress }: { userAddress: `0x${string}` }) {
  const { data: addresses, isLoading } = useAllMarketAddresses();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[#8b96a5]" />
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="border border-dashed border-[#1f2630] rounded-lg py-16 text-center text-[12.5px] text-[#6b7280]">
        No markets yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1f2630] bg-[#131820] overflow-hidden">
      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_110px_120px_110px] gap-4 items-center border-b border-[#1f2630] bg-[#0b0e12] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-[#6b7280]">
        <div>Market</div>
        <div>Side</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Est. payout</div>
        <div className="text-right">Status</div>
      </div>
      {addresses.map((addr) => (
        <PositionRow key={addr} marketAddress={addr} userAddress={userAddress} />
      ))}
    </div>
  );
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#f3f4f6]">
            Portfolio
          </h1>
          <p className="mt-1 text-[12.5px] text-[#6b7280]">
            Your active positions and claimable winnings.
          </p>
        </div>
        {isConnected && address && (
          <div className="hidden sm:block text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#6b7280]">Wallet</div>
            <div className="font-mono text-[12px] text-[#8b96a5]">
              {address.slice(0, 6)}…{address.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="border border-dashed border-[#1f2630] rounded-lg py-16 text-center">
          <div className="text-[13.5px] font-medium text-[#f3f4f6]">Connect your wallet</div>
          <p className="mt-1 text-[12.5px] text-[#6b7280]">
            Connect to view your positions and claim winnings.
          </p>
        </div>
      ) : (
        <PortfolioContent userAddress={address!} />
      )}
    </div>
  );
}
