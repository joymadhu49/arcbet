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
      className="flex items-start gap-2 rounded-[4px] border px-3 py-[10px] text-[12px] bg-[#131820]"
      style={{
        borderColor: `${color}55`,
        color: tone === "error" ? "#fca5a5" : "#fcd34d",
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="break-words font-medium">{message}</div>
        {hint && <div className="mt-0.5 text-[11px] opacity-80 break-words">{hint}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-[3px] p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
