export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-[10px]">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="1" y="1" width="20" height="20" rx="2" fill="none" stroke="#2d9cdb" strokeWidth="1.5" />
        {/* Stylized "P" for Propex */}
        <path d="M7 16 L7 6 L13 6 A3 3 0 0 1 13 12 L7 12" fill="none" stroke="#f3f4f6" strokeWidth="1.8" strokeLinejoin="miter" strokeLinecap="square" />
        <circle cx="16.5" cy="16.5" r="1.7" fill="#22c55e" />
      </svg>
      {!compact && (
        <>
          <span className="text-[15px] font-bold tracking-[-0.2px] text-[#f3f4f6]">PROPEX</span>
          <span className="mono text-[10px] uppercase tracking-[0.1em] text-[#6b7280] ml-[2px]">{"// v0.1"}</span>
        </>
      )}
    </div>
  );
}
