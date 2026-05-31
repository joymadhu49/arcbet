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
      className="flex-1 basis-[45%] sm:basis-0 min-w-[140px] px-3 sm:px-[18px] py-[12px] sm:py-[14px]"
      style={{
        // On mobile (wrapped): bottom border between rows.
        // On sm+: right border between cells, except the last.
        borderRight: last ? "none" : "1px solid #1f2630",
        borderBottom: "1px solid #1f2630",
      }}
    >
      <div className="label mb-[6px]">{label}</div>
      <div
        className="mono text-[16px] sm:text-[18px] font-semibold text-[#f3f4f6] tracking-[-0.3px] break-words"
        style={{ overflowWrap: "anywhere" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mono text-[11px] mt-[3px] break-words"
          style={{ color: subColor || "#8b96a5", overflowWrap: "anywhere" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap border border-[#1f2630] rounded-[12px] bg-[#131820] overflow-hidden [&>div]:sm:!border-b-0">
      {children}
    </div>
  );
}
