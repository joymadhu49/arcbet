import { ReactNode } from "react";

interface ItemProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subColor?: string;
  last?: boolean;
}

export function StatStripItem({ label, value, sub, subColor, last }: ItemProps) {
  return (
    <div
      className="flex-1 px-[18px] py-[14px]"
      style={{ borderRight: last ? "none" : "1px solid #1f2630" }}
    >
      <div className="label mb-[6px]">{label}</div>
      <div className="mono text-[18px] font-semibold text-[#f3f4f6] tracking-[-0.3px]">{value}</div>
      {sub && (
        <div className="mono text-[11px] mt-[3px]" style={{ color: subColor || "#8b96a5" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex border border-[#1f2630] rounded-[4px] bg-[#131820] overflow-hidden">
      {children}
    </div>
  );
}
