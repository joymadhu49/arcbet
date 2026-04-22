interface Props {
  /** Yes percentage 0..100 */
  yes: number;
  height?: number;
  showLabels?: boolean;
}

export default function OddsBar({ yes, height = 6, showLabels = false }: Props) {
  const y = Math.max(0, Math.min(100, yes));
  return (
    <div>
      {showLabels && (
        <div className="mono flex justify-between mb-1 text-[11px]">
          <span className="text-[#22c55e]">YES {y.toFixed(0)}¢</span>
          <span className="text-[#ef4444]">NO {(100 - y).toFixed(0)}¢</span>
        </div>
      )}
      <div
        className="flex overflow-hidden rounded-[2px] bg-[#1f2630]"
        style={{ height }}
      >
        <div style={{ width: `${y}%`, background: "linear-gradient(90deg,#15803d,#22c55e)" }} />
        <div style={{ width: `${100 - y}%`, background: "linear-gradient(90deg,#b91c1c,#ef4444)" }} />
      </div>
    </div>
  );
}
