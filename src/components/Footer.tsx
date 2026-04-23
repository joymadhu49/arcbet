import Link from "next/link";
import Logo from "@/components/Logo";

const TWITTER_URL = "https://x.com/zx_joy_";

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "text-[12.5px] text-[#8b96a5] hover:text-[#f3f4f6] transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function CategoryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group block"
    >
      <div className="text-[13px] font-medium text-[#f3f4f6] group-hover:text-[#2d9cdb] transition-colors">
        {label}
      </div>
      <div className="text-[11px] text-[#6b7280] mt-[2px]">Predictions &amp; odds</div>
    </Link>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-[#1f2630] mt-16 bg-[#0b0e12]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        {/* Brand */}
        <div className="mb-10">
          <Logo />
          <p className="mt-3 text-[13px] text-[#8b96a5] max-w-md">
            Daily prediction markets, settled in USDC on Arc.
          </p>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
          <div>
            <div className="label mb-4">Markets</div>
            <div className="flex flex-col gap-[14px]">
              <CategoryLink href="/?category=Crypto" label="Crypto" />
              <CategoryLink href="/?category=Sports" label="Sports" />
              <CategoryLink href="/?category=Politics" label="Politics" />
              <CategoryLink href="/?category=Tech" label="Tech" />
            </div>
          </div>

          <div>
            <div className="label mb-4">Propex</div>
            <div className="flex flex-col gap-[10px]">
              <FooterLink href="/">Markets</FooterLink>
              <FooterLink href="/portfolio">Portfolio</FooterLink>
              <FooterLink href="/leaderboard">Leaderboard</FooterLink>
              <FooterLink href="/docs">Docs</FooterLink>
            </div>
          </div>

          <div>
            <div className="label mb-4">Resources</div>
            <div className="flex flex-col gap-[10px]">
              <FooterLink href="/docs#how-it-works">How it works</FooterLink>
              <FooterLink href="/docs#fees">Fees</FooterLink>
              <FooterLink href="/docs#contracts">Contracts</FooterLink>
              <FooterLink href="https://docs.arc.network" external>
                Arc Network
              </FooterLink>
            </div>
          </div>

          <div>
            <div className="label mb-4">Support &amp; Social</div>
            <div className="flex flex-col gap-[10px]">
              <FooterLink href={TWITTER_URL} external>
                <span className="inline-flex items-center gap-[6px]">
                  <XIcon /> (Twitter)
                </span>
              </FooterLink>
              <FooterLink href="mailto:support@propex.xyz" external>
                <span className="inline-flex items-center gap-[6px]">
                  <MailIcon /> Contact
                </span>
              </FooterLink>
              <FooterLink href="/docs#support">Help Center</FooterLink>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-[#1f2630] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="text-[#6b7280] hover:text-[#f3f4f6] transition-colors"
            >
              <XIcon />
            </a>
            <a
              href="mailto:support@propex.xyz"
              aria-label="Email"
              className="text-[#6b7280] hover:text-[#f3f4f6] transition-colors"
            >
              <MailIcon />
            </a>
            <span className="mono text-[10.5px] text-[#3a4250] ml-2">v0.1 · testnet</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-[#6b7280]">
            <span>Propex © {new Date().getFullYear()}</span>
            <Link href="/docs#terms" className="hover:text-[#f3f4f6] transition-colors">
              Terms
            </Link>
            <Link href="/docs#privacy" className="hover:text-[#f3f4f6] transition-colors">
              Privacy
            </Link>
            <Link href="/docs" className="hover:text-[#f3f4f6] transition-colors">
              Docs
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] leading-[1.55] text-[#6b7280] max-w-4xl">
          Propex is a non-custodial prediction market platform running on Arc Testnet.
          All trades settle on-chain in USDC. Trading involves risk of loss; use only funds you can afford to lose.
          Markets are created and resolved according to the rules described in each market&apos;s description.
        </p>
      </div>
    </footer>
  );
}
