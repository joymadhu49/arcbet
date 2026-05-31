import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0e12",
};

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
      <body className="text-[#f3f4f6] antialiased overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <Ticker />
          <main className="min-h-[calc(100vh-86px)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
