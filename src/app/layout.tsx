import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArcBet — Prediction Markets on Arc",
  description: "Daily crypto prediction markets settled in USDC on Arc Testnet.",
  openGraph: {
    title: "ArcBet",
    description: "Daily crypto prediction markets on Arc Testnet",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="bg-[#0b0e12] text-[#f3f4f6] antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-[#1f2630] mt-16">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6b7280]">
              <span>ArcBet · Arc Testnet · Settled in USDC</span>
              <span className="font-mono text-[#3a4250]">v0.1 · testnet</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
