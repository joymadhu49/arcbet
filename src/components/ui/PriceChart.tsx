"use client";
import { useState } from "react";

interface Props {
  data: number[];
  height?: number;
  color?: string;
}

const RANGES = ["1H", "6H", "1D", "1W", "1M", "ALL"] as const;

export default function PriceChart({ data, height = 180, color = "#22c55e" }: Props) {
  const [range, setRange] = useState<string>("1W");
  const series = data.length ? data : [0.5, 0.5];
  const W = 640;
  const H = height;
  // Tailwind-only responsive heights are applied to the wrapper; the SVG uses
  // preserveAspectRatio="none" so it stretches to the wrapper height on mobile.
  const max = Math.max(...series);
  const min = Math.min(...series);
  const rangeY = max - min || 0.2;
  const pad = 8;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / rangeY) * (H - pad * 2);
    return [x, y] as const;
  });
  const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p.join(" ")).join(" ");
  const last = pts[pts.length - 1];
  const area = `${path} L${last[0]} ${H} L${pts[0][0]} ${H} Z`;

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full h-[140px] sm:h-[170px] md:h-[180px]"
      >
        <defs>
          <linearGradient id="pcFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.18" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <pattern id="pcGrid" x="0" y="0" width="64" height="36" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 36" fill="none" stroke="#1f2630" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#pcGrid)" />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="#1f2630"
            strokeDasharray="2 4"
            strokeWidth="0.5"
          />
        ))}
        <path d={area} fill="url(#pcFill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
        <circle cx={last[0]} cy={last[1]} r="6" fill={color} opacity="0.25" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-1 sm:mt-0 sm:absolute sm:right-[10px] sm:top-[10px] sm:flex-nowrap">
        {RANGES.map((t) => {
          const active = t === range;
          return (
            <button
              key={t}
              onClick={() => setRange(t)}
              className="mono text-[10px] tracking-[0.08em] rounded-full cursor-pointer px-[10px] py-[6px] sm:px-[9px] sm:py-[3px] min-h-[28px] sm:min-h-0 transition-colors duration-150 ease-out"
              style={{
                background: active ? "#1f2630" : "transparent",
                border: `1px solid ${active ? "#2a3340" : "transparent"}`,
                color: active ? "#f3f4f6" : "#8b96a5",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
