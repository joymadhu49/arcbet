"use client";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  message: string;
  hint?: string;
  onDismiss?: () => void;
  tone?: "error" | "warning";
}

export default function TxBanner({ message, hint, onDismiss, tone = "error" }: Props) {
  const color = tone === "error" ? "#ef4444" : "#f59e0b";
  return (
    <div
      role="alert"
      className="animate-rise flex items-start gap-2.5 rounded-[8px] border px-3.5 py-3 text-[12px] bg-[#131820] shadow-[0_1px_2px_rgba(0,0,0,0.25)] w-full max-w-full overflow-hidden"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}0d`,
        color: tone === "error" ? "#fca5a5" : "#fcd34d",
      }}
    >
      <AlertTriangle className="h-4 w-4 mt-px shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="break-words font-medium leading-snug">{message}</div>
        {hint && <div className="mt-1 text-[11px] opacity-80 break-words leading-snug">{hint}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 inline-flex items-center justify-center h-[28px] w-[28px] -my-1 -mr-1.5 rounded-[6px] opacity-70 hover:opacity-100 hover:bg-white/5 transition-all duration-150 ease-out"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
