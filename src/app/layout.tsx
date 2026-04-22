import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Ticker from "@/components/Ticker";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Propex — Prediction Markets on Arc",
  description: "Daily crypto prediction markets settled in USDC on Arc Testnet.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Propex",
    description: "Daily crypto prediction markets on Arc Testnet",
    type: "website",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`} suppressHydrationWarning>
      <body className="text-[#f3f4f6] antialiased" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <Ticker />
          <main className="min-h-[calc(100vh-86px)]">{children}</main>
          <footer className="border-t border-[#1f2630] mt-16">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6b7280]">
              <span>Propex · Arc Testnet · Settled in USDC</span>
              <span className="mono text-[#3a4250]">v0.1 · testnet</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
