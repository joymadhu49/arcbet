export default function LeaderboardPage() {
  return (
    <div className="bg-[#0b0e12]">
      <div className="px-4 sm:px-6 lg:px-8 pt-7 pb-8 animate-rise">
        <div className="mb-5 sm:mb-6">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.4px] text-[#f3f4f6]">
            Leaderboard
          </h1>
          <div className="mono label text-[#6b7280] mt-1.5">
            Top traders · by P&L · by volume
          </div>
        </div>

        <div className="border border-[#1f2630] bg-[#131820] rounded-[16px] shadow-[var(--shadow-card)] px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-[8px] rounded-full border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-3 py-1.5 mb-5">
            <span className="w-[8px] h-[8px] rounded-full bg-[#f59e0b] animate-live" />
            <span className="mono label text-[#f59e0b]">Coming soon</span>
          </div>
          <div className="text-[17px] font-semibold tracking-[-0.2px] text-[#f3f4f6]">
            Leaderboards are on the way
          </div>
          <p className="mx-auto mt-2.5 max-w-[440px] text-[13px] leading-relaxed text-[#8b96a5]">
            We&apos;re indexing on-chain bet and claim events off-chain so we can rank traders
            by realized P&amp;L, volume, and win rate. Expect this to light up once the
            indexer ships in the next cycle.
          </p>

          <div className="mx-auto mt-8 grid max-w-[480px] grid-cols-3 gap-2.5">
            {["Realized P&L", "Volume", "Win rate"].map((metric) => (
              <div
                key={metric}
                className="rounded-[8px] border border-[#1f2630] bg-[#0b0e12] px-3 py-3.5"
              >
                <div className="mono label text-[#6b7280]">{metric}</div>
                <div className="mt-1.5 mx-auto h-[6px] w-2/3 rounded-full bg-[#1f2630]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
