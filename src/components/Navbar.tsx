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
    ? `flex items-center h-[44px] mx-2 px-4 rounded-[8px] text-[14px] font-medium border-l-[3px] transition-all duration-150 ease-out ${
        active
          ? "text-[#f3f4f6] border-[#2d9cdb] bg-[#161d28]"
          : "text-[#8b96a5] border-transparent hover:text-[#f3f4f6] hover:bg-[#131820]"
      }`
    : `relative flex items-end h-[56px] pb-[16px] text-[13px] font-medium transition-colors duration-150 ease-out mr-[24px] ${
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
        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#2d9cdb]" />
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
      <nav className="sticky top-0 z-50 border-b border-[#1f2630] bg-[#0b0e12]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[#0b0e12]/70 flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 h-[56px] max-w-full">
        <div className="flex items-center gap-4 md:gap-9 min-w-0 flex-1">
          <Link href="/" className="flex items-center shrink-0" onClick={closeMenu}>
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

        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="min-w-0 max-w-[55vw] sm:max-w-none truncate [&_button]:!min-h-[40px]">
            <ConnectButton
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
              chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
              showBalance={{ smallScreen: false, largeScreen: false }}
            />
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center h-[44px] w-[44px] rounded-[8px] border border-[#1f2630] bg-[#131820] text-[#8b96a5] hover:text-[#f3f4f6] hover:border-[#2a3340] hover:bg-[#161d28] transition-all duration-150 ease-out"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-[20px] w-[20px]" /> : <Menu className="h-[20px] w-[20px]" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[56px] z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={closeMenu}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-[56px] z-50 border-b border-[#1f2630] bg-[#0b0e12]/95 backdrop-blur-md shadow-[var(--shadow-card)] animate-rise md:hidden max-h-[calc(100vh-56px)] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <nav className="flex flex-col py-2 gap-1">
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
