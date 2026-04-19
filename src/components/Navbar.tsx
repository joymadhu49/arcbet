"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function Navbar() {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const navLink = (href: string, label: string, adminStyle = false) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`relative h-16 flex items-center px-1 text-sm transition-colors ${
          active
            ? "text-[#f3f4f6]"
            : adminStyle
              ? "text-[#ef4444]/80 hover:text-[#ef4444]"
              : "text-[#8b96a5] hover:text-[#f3f4f6]"
        }`}
      >
        {label}
        {active && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2d9cdb]" />
        )}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1f2630] bg-[#0b0e12]/95 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-8">
          {/* Logo — flat, no gradient */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2d9cdb] text-[#0b0e12] font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-[#f3f4f6]">
              ArcBet
            </span>
          </Link>

          {/* Primary nav — flat, underline active */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            {navLink("/", "Markets")}
            {navLink("/portfolio", "Portfolio")}
            {isAdmin && navLink("/admin", "Admin", true)}
          </div>

          {/* Mobile: push connect to the right */}
          <div className="md:hidden flex-1" />

          {/* RainbowKit — untouched */}
          <div className="shrink-0">
            <ConnectButton
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
              chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
              showBalance={{ smallScreen: false, largeScreen: false }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
