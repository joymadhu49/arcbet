"use client";
import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { toast } from "sonner";
import { parseUSDC } from "@/lib/utils";
import { USDC_ADDRESS } from "@/lib/constants";
import { PREDICTION_MARKET_ABI, ERC20_ABI } from "@/lib/abi";
import { BetSide } from "@/types";

export function useBet(marketAddress: `0x${string}`) {
  const { address } = useAccount();
  const [step, setStep] = useState<"idle" | "approving" | "betting" | "done">("idle");

  // USDC Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, marketAddress] : undefined,
    query: { enabled: !!address },
  });

  // USDC Balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: placeBet } = useWriteContract();

  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [betTxHash, setBetTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isApproveLoading } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isBetLoading } = useWaitForTransactionReceipt({ hash: betTxHash });

  const isLoading = isApproveLoading || isBetLoading || step !== "idle";

  async function bet(side: BetSide, amountStr: string) {
    if (!address) { toast.error("Connect wallet first"); return; }

    const amount = parseUSDC(amountStr);

    try {
      // 1. Approve if needed
      if (!allowance || allowance < amount) {
        setStep("approving");
        toast.loading("Approving USDC…", { id: "bet" });

        const hash = await approve({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, amount],
        });
        setApproveTxHash(hash);
        await refetchAllowance();
      }

      // 2. Place bet
      setStep("betting");
      toast.loading("Placing bet…", { id: "bet" });

      const hash = await placeBet({
        address: marketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: "placeBet",
        args: [side === "YES", amount],
      });
      setBetTxHash(hash);
      setStep("done");
      toast.success(`Bet placed on ${side}! 🎉`, { id: "bet" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Transaction failed", { id: "bet" });
      setStep("idle");
    }
  }

  async function claimWinnings() {
    try {
      toast.loading("Claiming winnings…", { id: "claim" });
      const hash = await placeBet({
        address: marketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: "claimWinnings",
      });
      setBetTxHash(hash);
      toast.success("Winnings claimed! 💰", { id: "claim" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? "Claim failed", { id: "claim" });
    }
  }

  return {
    bet,
    claimWinnings,
    step,
    isLoading,
    usdcBalance,
    approveTxHash,
    betTxHash,
  };
}
