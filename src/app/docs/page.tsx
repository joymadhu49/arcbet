import Link from "next/link";
import type { Metadata } from "next";
import { ARC_CONTRACTS, PLATFORM_FEE_BPS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Docs — Propex",
  description:
    "How Propex prediction markets work: FPMM pricing, fees, settlement, and Arc contracts.",
};

type Section = {
  id: string;
  title: string;
};

const SECTIONS: Section[] = [
  { id: "overview", title: "Overview" },
  { id: "how-it-works", title: "How it works" },
  { id: "trading", title: "Trading" },
  { id: "fees", title: "Fees" },
  { id: "resolution", title: "Resolution" },
  { id: "contracts", title: "Contracts" },
  { id: "leaderboard", title: "Leaderboard" },
  { id: "admin", title: "Admin & launches" },
  { id: "faq", title: "FAQ" },
  { id: "support", title: "Support" },
  { id: "terms", title: "Terms" },
  { id: "privacy", title: "Privacy" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[110px]">
      <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-[#f3f4f6] mb-4">
        {title}
      </h2>
      <div className="text-[13.5px] leading-[1.7] text-[#c7cdd5] space-y-4">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mono text-[12px] bg-[#131820] border border-[#1f2630] px-[6px] py-[1px] rounded-[3px] text-[#e5e7eb]">
      {children}
    </code>
  );
}

function ContractRow({ name, address }: { name: string; address: string }) {
  return (
    <div className="flex items-center justify-between border border-[#1f2630] rounded-[4px] px-3 py-2.5 bg-[#0f141b]">
      <span className="text-[13px] text-[#f3f4f6] font-medium">{name}</span>
      <span className="mono text-[11.5px] text-[#8b96a5] truncate ml-3">{address}</span>
    </div>
  );
}

export default function DocsPage() {
  const feePct = (PLATFORM_FEE_BPS / 100).toFixed(2);

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="border-b border-[#1f2630] pb-6 mb-10">
        <div className="mono label mb-3">Documentation</div>
        <h1 className="text-[32px] font-semibold tracking-[-0.6px] text-[#f3f4f6] mb-2">
          Propex Docs
        </h1>
        <p className="text-[14px] text-[#8b96a5] max-w-2xl">
          A guide to using Propex — daily prediction markets settled on-chain in USDC on
          Arc Testnet. Everything you need to trade, resolve, and integrate.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[110px] lg:self-start">
          <div className="label mb-3">On this page</div>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-[13px] text-[#8b96a5] hover:text-[#f3f4f6] transition-colors py-[6px] px-[10px] -mx-[10px] rounded-[3px] hover:bg-[#131820]"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="space-y-12">
          <Section id="overview" title="Overview">
            <p>
              Propex is a non-custodial prediction-market platform. Each market asks a
              binary question — will X happen by time Y? Users buy <Code>YES</Code> or{" "}
              <Code>NO</Code> shares against an automated market maker. When the market
              resolves, winning shares redeem 1:1 for USDC.
            </p>
            <p>
              Everything runs on-chain on{" "}
              <a
                href="https://arc.network"
                className="text-[#2d9cdb] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Arc Testnet
              </a>
              . USDC is the native settlement asset. Propex itself does not custody user
              funds — trades are executed by the per-market contract.
            </p>
          </Section>

          <Section id="how-it-works" title="How it works">
            <p>
              Each market is a standalone <Code>PredictionMarket</Code> contract using a
              Fixed-Product Market Maker (FPMM). Two reserves —{" "}
              <Code>yesReserve</Code> and <Code>noReserve</Code> — are kept on an
              invariant curve. Buying YES shares removes YES from the pool, pushing its
              implied probability up; selling does the reverse. Prices are always between
              $0.00 and $1.00 and sum to one.
            </p>
            <ol className="list-decimal ml-5 space-y-1.5 text-[13px]">
              <li>An admin deploys a market via the factory, seeded with USDC liquidity.</li>
              <li>Traders buy/sell YES or NO shares at the current curve price.</li>
              <li>At the resolution time, the outcome is submitted on-chain.</li>
              <li>Winning shares redeem 1:1 for USDC. Losing shares expire worthless.</li>
            </ol>
          </Section>

          <Section id="trading" title="Trading">
            <p>
              To trade, connect a wallet on Arc Testnet and open any market. Enter a USDC
              amount for <Code>Buy</Code>, or a share amount for <Code>Sell</Code>. The
              UI quotes the expected shares / USDC you&apos;ll receive at the current curve
              price, including fee.
            </p>
            <ul className="list-disc ml-5 space-y-1.5 text-[13px]">
              <li>
                Minimum bet size is <Code>0.01 USDC</Code> so fees never round to zero.
              </li>
              <li>You can exit a position at any time by selling back into the pool.</li>
              <li>Slippage increases with size relative to pool depth — check the quote before confirming.</li>
            </ul>
          </Section>

          <Section id="fees" title="Fees">
            <p>
              A flat platform fee of <strong className="text-[#f3f4f6]">{feePct}%</strong>{" "}
              applies symmetrically on both buy and sell. Fees are forwarded on-chain to
              the <Code>Treasury</Code> contract the moment a trade settles — there are
              no withdrawal or deposit fees, no spread, and no hidden charges.
            </p>
            <p className="text-[12.5px] text-[#8b96a5]">
              The fee rate is bounded on-chain by <Code>MAX_FEE_BPS</Code> in the
              Treasury and can be updated by the owner within that cap.
            </p>
          </Section>

          <Section id="resolution" title="Resolution">
            <p>
              Each market specifies a resolution time and a resolution rule in its
              description. After the resolution time elapses, an authorized resolver
              submits the outcome on-chain (<Code>YES</Code>, <Code>NO</Code>, or{" "}
              <Code>CANCELLED</Code>).
            </p>
            <ul className="list-disc ml-5 space-y-1.5 text-[13px]">
              <li><strong className="text-[#f3f4f6]">YES / NO:</strong> winning shares redeem 1 USDC each.</li>
              <li><strong className="text-[#f3f4f6]">CANCELLED:</strong> all positions are refunded at pool-proportional value.</li>
              <li>Resolved markets are removed from the live feed and remain accessible at their market URL.</li>
            </ul>
          </Section>

          <Section id="contracts" title="Contracts">
            <p>
              Core addresses on Arc Testnet. Market addresses are deterministic per
              factory deploy — find them via the factory&apos;s{" "}
              <Code>getAllMarkets()</Code>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ContractRow name="USDC" address={ARC_CONTRACTS.USDC} />
              <ContractRow name="EURC" address={ARC_CONTRACTS.EURC} />
              <ContractRow name="USYC" address={ARC_CONTRACTS.USYC} />
              <ContractRow name="Multicall3" address={ARC_CONTRACTS.Multicall3} />
              <ContractRow name="Permit2" address={ARC_CONTRACTS.Permit2} />
              <ContractRow name="TokenMessengerV2" address={ARC_CONTRACTS.TokenMessengerV2} />
            </div>
          </Section>

          <Section id="leaderboard" title="Leaderboard">
            <p>
              The <Link href="/leaderboard" className="text-[#2d9cdb] hover:underline">leaderboard</Link>{" "}
              ranks traders by realized PnL across resolved markets. Data is derived
              entirely from on-chain events — no off-chain scoring or boosts.
            </p>
          </Section>

          <Section id="admin" title="Admin & launches">
            <p>
              New markets are launched in a daily batch by the admin wallet through the{" "}
              <Link href="/admin" className="text-[#2d9cdb] hover:underline">
                admin panel
              </Link>
              . Each launch seeds USDC liquidity from the treasury and registers the
              market with the factory. The admin role is a client-side UX gate; on-chain
              authority is enforced by <Code>MarketFactory.owner</Code>.
            </p>
          </Section>

          <Section id="faq" title="FAQ">
            <div className="space-y-4">
              <div>
                <div className="text-[13.5px] font-semibold text-[#f3f4f6] mb-1">
                  What happens if a trade partially fills?
                </div>
                <p>
                  FPMM trades are atomic — the quote shown before confirming is what
                  settles. There is no partial fill.
                </p>
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-[#f3f4f6] mb-1">
                  Can I cancel a pending trade?
                </div>
                <p>
                  Trades that haven&apos;t been confirmed on-chain can be cancelled in
                  your wallet. Once mined, exit by selling your shares back.
                </p>
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-[#f3f4f6] mb-1">
                  Is Propex available in my region?
                </div>
                <p>
                  Propex runs on a public testnet for research purposes. Availability
                  depends on local regulations; consult your jurisdiction.
                </p>
              </div>
            </div>
          </Section>

          <Section id="support" title="Support">
            <p>
              For questions, bug reports, or feedback — reach out on{" "}
              <a
                href="https://x.com/zx_joy_"
                className="text-[#2d9cdb] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                X (Twitter)
              </a>{" "}
              or email{" "}
              <a
                href="mailto:support@propex.xyz"
                className="text-[#2d9cdb] hover:underline"
              >
                support@propex.xyz
              </a>
              . For on-chain issues include your wallet address, the market address, and
              the tx hash.
            </p>
          </Section>

          <Section id="terms" title="Terms">
            <p className="text-[12.5px] text-[#8b96a5]">
              Propex is provided &quot;as is&quot; on Arc Testnet for research and
              evaluation. Trading involves risk of loss; do not deposit funds you cannot
              afford to lose. By using Propex you acknowledge that markets may resolve
              adversely and that on-chain transactions are irreversible.
            </p>
          </Section>

          <Section id="privacy" title="Privacy">
            <p className="text-[12.5px] text-[#8b96a5]">
              Propex does not collect personal data. Wallet addresses and trade history
              are public on-chain data. The front-end may load third-party RPC endpoints
              and price feeds; those providers may log requests independently of Propex.
            </p>
          </Section>

          {/* Footer of docs */}
          <div className="pt-6 border-t border-[#1f2630] flex items-center justify-between">
            <span className="text-[12px] text-[#6b7280]">
              Last updated {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <Link
              href="/"
              className="text-[12.5px] text-[#2d9cdb] hover:underline"
            >
              ← Back to markets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
