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
    "text-[12.5px] text-[#8b96a5] hover:text-[#f3f4f6] transition-colors duration-150 ease-out w-fit";
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
      className="group block w-fit"
    >
      <div className="text-[13px] font-medium text-[#f3f4f6] group-hover:text-[#2d9cdb] transition-colors duration-150 ease-out">
        {label}
      </div>
      <div className="text-[11px] text-[#6b7280] mt-[3px] group-hover:text-[#8b96a5] transition-colors duration-150 ease-out">Predictions &amp; odds</div>
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
    <footer className="border-t border-[#1f2630] mt-16 bg-[#0b0e12] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
        {/* Brand */}
        <div className="mb-8 sm:mb-12">
          <Logo />
          <p className="mt-3.5 text-[13px] leading-relaxed text-[#8b96a5] max-w-md">
            Daily prediction markets, settled in USDC on Arc.
          </p>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-10">
          <div>
            <div className="label mb-[18px]">Markets</div>
            <div className="flex flex-col gap-[14px]">
              <CategoryLink href="/?category=Crypto" label="Crypto" />
              <CategoryLink href="/?category=Sports" label="Sports" />
              <CategoryLink href="/?category=Politics" label="Politics" />
              <CategoryLink href="/?category=Tech" label="Tech" />
            </div>
          </div>

          <div>
            <div className="label mb-[18px]">Propex</div>
            <div className="flex flex-col gap-[12px]">
              <FooterLink href="/">Markets</FooterLink>
              <FooterLink href="/portfolio">Portfolio</FooterLink>
              <FooterLink href="/leaderboard">Leaderboard</FooterLink>
              <FooterLink href="/docs">Docs</FooterLink>
            </div>
          </div>

          <div>
            <div className="label mb-[18px]">Resources</div>
            <div className="flex flex-col gap-[12px]">
              <FooterLink href="/docs#how-it-works">How it works</FooterLink>
              <FooterLink href="/docs#fees">Fees</FooterLink>
              <FooterLink href="/docs#contracts">Contracts</FooterLink>
              <FooterLink href="https://docs.arc.network" external>
                Arc Network
              </FooterLink>
            </div>
          </div>

          <div>
            <div className="label mb-[18px]">Support &amp; Social</div>
            <div className="flex flex-col gap-[12px]">
              <FooterLink href={TWITTER_URL} external>
                <span className="inline-flex items-center gap-[7px]">
                  <XIcon /> (Twitter)
                </span>
              </FooterLink>
              <FooterLink href="mailto:support@propex.xyz" external>
                <span className="inline-flex items-center gap-[7px]">
                  <MailIcon /> Contact
                </span>
              </FooterLink>
              <FooterLink href="/docs#support">Help Center</FooterLink>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-[#1f2630] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="inline-flex items-center justify-center h-[44px] w-[44px] rounded-[8px] text-[#6b7280] hover:text-[#f3f4f6] hover:bg-[#161d28] transition-all duration-150 ease-out"
            >
              <XIcon />
            </a>
            <a
              href="mailto:support@propex.xyz"
              aria-label="Email"
              className="inline-flex items-center justify-center h-[44px] w-[44px] rounded-[8px] text-[#6b7280] hover:text-[#f3f4f6] hover:bg-[#161d28] transition-all duration-150 ease-out"
            >
              <MailIcon />
            </a>
            <span className="mono text-[10.5px] text-[#3a4250] ml-3">v0.1 · testnet</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-[#6b7280]">
            <span>Propex © {new Date().getFullYear()}</span>
            <Link href="/docs#terms" className="hover:text-[#f3f4f6] transition-colors duration-150 ease-out">
              Terms
            </Link>
            <Link href="/docs#privacy" className="hover:text-[#f3f4f6] transition-colors duration-150 ease-out">
              Privacy
            </Link>
            <Link href="/docs" className="hover:text-[#f3f4f6] transition-colors duration-150 ease-out">
              Docs
            </Link>
          </div>
        </div>

        <p className="mt-7 text-[11px] leading-[1.6] text-[#6b7280] max-w-4xl break-words">
          Propex is a non-custodial prediction market platform running on Arc Testnet.
          All trades settle on-chain in USDC. Trading involves risk of loss; use only funds you can afford to lose.
          Markets are created and resolved according to the rules described in each market&apos;s description.
        </p>
      </div>
    </footer>
  );
}
