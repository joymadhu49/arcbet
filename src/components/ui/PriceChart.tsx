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
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
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
      <div className="absolute right-[10px] top-[10px] flex gap-1">
        {RANGES.map((t) => {
          const active = t === range;
          return (
            <button
              key={t}
              onClick={() => setRange(t)}
              className="mono text-[10px] tracking-[0.08em] rounded-[2px] cursor-pointer"
              style={{
                padding: "3px 8px",
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
