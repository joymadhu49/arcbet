"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Logo from "@/components/Logo";

function NavLink({
  href,
  label,
  active,
  external,
}: {
  href: string;
  label: string;
  active: boolean;
  external?: boolean;
}) {
  const className = `relative flex items-end h-[56px] pb-[16px] text-[13px] font-medium transition-colors mr-[24px] ${
    active ? "text-[#f3f4f6]" : "text-[#8b96a5] hover:text-[#f3f4f6]"
  }`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
      {active && <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#2d9cdb]" />}
    </Link>
  );
}

export default function Navbar() {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || (pathname?.startsWith("/market") ?? false);
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1f2630] bg-[#0b0e12] flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[56px]">
      <div className="flex items-center gap-9">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <div className="hidden md:flex items-end h-[56px]">
          <NavLink href="/" label="Markets" active={isActive("/")} />
          <NavLink href="/portfolio" label="Portfolio" active={isActive("/portfolio")} />
          <NavLink href="/leaderboard" label="Leaderboard" active={isActive("/leaderboard")} />
          {isAdmin && <NavLink href="/admin" label="Admin" active={isActive("/admin")} />}
          <NavLink href="https://docs.arcbet.xyz" label="Docs" active={false} external />
        </div>
      </div>

      <div className="shrink-0">
        <ConnectButton
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
          showBalance={{ smallScreen: false, largeScreen: false }}
        />
      </div>
    </nav>
  );
}
