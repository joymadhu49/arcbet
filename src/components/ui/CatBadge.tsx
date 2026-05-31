export default function CatBadge({ label }: { label: string }) {
  return (
    <span
      className="mono uppercase text-[9px] tracking-[0.16em] text-[#8b96a5] border border-[#1f2630] bg-[#0b0e12] rounded-full px-[8px] py-[2px] inline-block max-w-full truncate align-middle"
      title={label}
    >
      {label}
    </span>
  );
}
