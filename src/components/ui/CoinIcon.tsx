import { COIN_BY_ID, type CoinId } from "@/lib/coingecko";
import { parseCryptoDescription } from "@/lib/cryptoMarkets";
import { MarketData } from "@/types";

const CATEGORY_GRAD: Record<string, { bg: string; glyph: string }> = {
  Crypto:        { bg: "linear-gradient(135deg,#f7931a,#f59e0b)", glyph: "₿" },
  Sports:        { bg: "linear-gradient(135deg,#f59e0b,#ef4444)", glyph: "🏆" },
  Politics:      { bg: "linear-gradient(135deg,#a855f7,#7c3aed)", glyph: "🏛" },
  Tech:          { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", glyph: "◇" },
  Entertainment: { bg: "linear-gradient(135deg,#ec4899,#be185d)", glyph: "★" },
  Default:       { bg: "linear-gradient(135deg,#2d9cdb,#1d4ed8)", glyph: "◈" },
};

interface Props {
  market?: Pick<MarketData, "imageUrl" | "category" | "description">;
  size?: number;
  glyph?: string;
  bg?: string;
}

export default function CoinIcon({ market, size = 36, glyph, bg }: Props) {
  let finalGlyph = glyph;
  let finalBg = bg;

  if (market && !finalGlyph) {
    const parsed = parseCryptoDescription(market.description);
    if (parsed) {
      const coin = COIN_BY_ID[parsed.coin as CoinId];
      if (coin) {
        finalGlyph = coin.symbol[0];
        finalBg = `linear-gradient(135deg, ${coin.color}, ${coin.color}aa)`;
      }
    }
  }

  if (!finalGlyph) {
    const def = CATEGORY_GRAD[market?.category ?? "Default"] ?? CATEGORY_GRAD.Default;
    finalGlyph = def.glyph;
    finalBg = def.bg;
  }

  if (market?.imageUrl) {
    return (
      <div
        className="shrink-0 rounded-full overflow-hidden ring-1 ring-[rgba(255,255,255,0.08)]"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={market.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: finalBg,
        fontSize: size * 0.42,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      {finalGlyph}
    </div>
  );
}
