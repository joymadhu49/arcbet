"use client";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wifi } from "lucide-react";
import { arcTestnet } from "@/lib/chains";

interface Props {
  children?: React.ReactNode;
  showWhenConnected?: boolean;
  compact?: boolean;
}

/**
 * Renders a banner when the user is on the wrong chain or not connected.
 * If everything is fine and `showWhenConnected` is false, renders `children`.
 */
export default function NetworkGate({ children, showWhenConnected = false, compact = false }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const wrongChain = isConnected && chainId !== arcTestnet.id;

  if (!isConnected) {
    return (
      <div
        className={`animate-rise flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-[8px] border border-[#f59e0b]/40 bg-[#131820] shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${
          compact ? "px-3.5 py-2.5 text-[12px]" : "px-4 py-3 sm:px-[18px] text-[13px]"
        } text-[#fcd34d]`}
      >
        <span className="flex items-center gap-2">
          <Wifi className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
          Connect a wallet to continue.
        </span>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-[6px] border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-3.5 py-[8px] sm:py-[5px] text-[11.5px] font-semibold text-[#fcd34d] hover:bg-[#f59e0b]/25 hover:border-[#f59e0b]/70 transition-all duration-150 ease-out"
            >
              Connect
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div
        className={`animate-rise flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-[8px] border border-[#ef4444]/40 bg-[#131820] shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${
          compact ? "px-3.5 py-2.5 text-[12px]" : "px-4 py-3 sm:px-[18px] text-[13px]"
        } text-[#fca5a5]`}
      >
        <span className="flex items-center gap-2">
          <Wifi className="h-3.5 w-3.5 shrink-0 text-[#ef4444]" />
          Wrong network — switch to {arcTestnet.name}.
        </span>
        <button
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          disabled={isPending}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-[6px] border border-[#ef4444]/50 bg-[#ef4444]/15 px-3.5 py-[8px] sm:py-[5px] text-[11.5px] font-semibold text-[#fca5a5] hover:bg-[#ef4444]/25 hover:border-[#ef4444]/70 disabled:opacity-50 transition-all duration-150 ease-out"
        >
          {isPending ? "Switching…" : "Switch"}
        </button>
      </div>
    );
  }

  return showWhenConnected ? <>{children}</> : <>{children}</>;
}

/** Thin hook returning gating flags so callers can disable buttons. */
export function useChainGate() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const wrongChain = isConnected && chainId !== arcTestnet.id;
  return { isConnected, wrongChain, address, chainId };
}
