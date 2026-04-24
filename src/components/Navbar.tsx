"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Logo from "@/components/Logo";

function NavLink({
  href,
  label,
  active,
  external,
  onClick,
  compact = false,
}: {
  href: string;
  label: string;
  active: boolean;
  external?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const className = compact
    ? `flex items-center h-[44px] px-4 text-[14px] font-medium border-l-[3px] transition-colors ${
        active
          ? "text-[#f3f4f6] border-[#2d9cdb] bg-[#131820]"
          : "text-[#8b96a5] border-transparent hover:text-[#f3f4f6] hover:bg-[#131820]"
      }`
    : `relative flex items-end h-[56px] pb-[16px] text-[13px] font-medium transition-colors mr-[24px] ${
        active ? "text-[#f3f4f6]" : "text-[#8b96a5] hover:text-[#f3f4f6]"
      }`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {label}
      {!compact && active && (
        <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#2d9cdb]" />
      )}
    </Link>
  );
}

export default function Navbar() {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || (pathname?.startsWith("/market") ?? false);
    return pathname?.startsWith(href) ?? false;
  };

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[#1f2630] bg-[#0b0e12] flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[56px]">
        <div className="flex items-center gap-9 min-w-0">
          <Link href="/" className="flex items-center shrink-0">
            <Logo compact={false} />
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-end h-[56px]">
            <NavLink href="/" label="Markets" active={isActive("/")} />
            <NavLink href="/portfolio" label="Portfolio" active={isActive("/portfolio")} />
            <NavLink href="/leaderboard" label="Leaderboard" active={isActive("/leaderboard")} />
            {isAdmin && <NavLink href="/admin" label="Admin" active={isActive("/admin")} />}
            <NavLink href="/docs" label="Docs" active={isActive("/docs")} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConnectButton
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
            showBalance={{ smallScreen: false, largeScreen: false }}
          />
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center h-[40px] w-[40px] rounded-[4px] border border-[#1f2630] bg-[#131820] text-[#8b96a5] hover:text-[#f3f4f6] hover:border-[#2a3340] transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[56px] z-40 bg-black/60 md:hidden"
            onClick={closeMenu}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-[56px] z-50 border-b border-[#1f2630] bg-[#0b0e12] md:hidden">
            <nav className="flex flex-col">
              <NavLink href="/" label="Markets" active={isActive("/")} onClick={closeMenu} compact />
              <NavLink href="/portfolio" label="Portfolio" active={isActive("/portfolio")} onClick={closeMenu} compact />
              <NavLink href="/leaderboard" label="Leaderboard" active={isActive("/leaderboard")} onClick={closeMenu} compact />
              {isAdmin && (
                <NavLink href="/admin" label="Admin" active={isActive("/admin")} onClick={closeMenu} compact />
              )}
              <NavLink href="/docs" label="Docs" active={isActive("/docs")} onClick={closeMenu} compact />
            </nav>
          </div>
        </>
      )}
    </>
  );
}
