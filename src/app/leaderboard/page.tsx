export default function LeaderboardPage() {
  return (
    <div className="bg-[#0b0e12]">
      <div className="px-4 sm:px-6 lg:px-8 pt-7 pb-5">
        <div className="mb-[18px]">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.4px] text-[#f3f4f6]">
            Leaderboard
          </h1>
          <div className="mono label text-[#6b7280] mt-1">
            Top traders · by P&L · by volume
          </div>
        </div>

        <div className="border border-dashed border-[#1f2630] rounded-[4px] py-20 text-center">
          <div className="inline-flex items-center gap-[8px] mb-3">
            <span className="w-[8px] h-[8px] rounded-full bg-[#f59e0b] animate-live" />
            <span className="mono label text-[#f59e0b]">Coming soon</span>
          </div>
          <div className="text-[15px] font-semibold text-[#f3f4f6]">
            Leaderboards are on the way
          </div>
          <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] text-[#8b96a5]">
            We&apos;re indexing on-chain bet and claim events off-chain so we can rank traders
            by realized P&amp;L, volume, and win rate. Expect this to light up once the
            indexer ships in the next cycle.
          </p>
        </div>
      </div>
    </div>
  );
}
