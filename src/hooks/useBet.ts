"use client";
import { useState } from "react";
import {
  useWriteContract,
  useReadContract,
  useAccount,
  usePublicClient,
} from "wagmi";
import { toast } from "sonner";
import { parseUSDC } from "@/lib/utils";
import { USDC_ADDRESS } from "@/lib/constants";
import { PREDICTION_MARKET_ABI, ERC20_ABI } from "@/lib/abi";
import { BetSide } from "@/types";
import { txErrorMessage } from "@/lib/errors";

/** Default 1% slippage tolerance applied to previews. */
const SLIPPAGE_BPS = 100n;

function withSlippage(expected: bigint, bps: bigint = SLIPPAGE_BPS): bigint {
  const slack = (expected * bps) / 10_000n;
  return expected > slack ? expected - slack : 0n;
}

export function useBet(marketAddress: `0x${string}`) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<"idle" | "approving" | "buying" | "selling" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, marketAddress] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBalance, isLoading: balanceLoading, refetch: refetchBalance } =
    useReadContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    });

  const { writeContractAsync } = useWriteContract();

  /**
   * Buy shares with USDC via the FPMM.
   * @param side       "YES" or "NO"
   * @param amountStr  USDC amount as decimal string (e.g. "10.50")
   * @param previewShares  Optional preview from previewBuy(); used for slippage floor.
   */
  async function buy(side: BetSide, amountStr: string, previewShares?: bigint) {
    setError(null);
    if (!address) {
      const msg = "Connect wallet first";
      setError(msg);
      toast.error(msg);
      return;
    }

    const amount = parseUSDC(amountStr);
    const minSharesOut = previewShares ? withSlippage(previewShares) : 0n;

    try {
      if (!allowance || (allowance as bigint) < amount) {
        setStep("approving");
        toast.loading("Approving USDC…", { id: "bet" });
        const hash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, amount],
        });
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        await refetchAllowance();
      }

      setStep("buying");
      toast.loading(`Buying ${side}…`, { id: "bet" });
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: "buy",
        args: [side === "YES", amount, minSharesOut],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      setStep("done");
      toast.success(`${side} shares bought`, { id: "bet" });
      await refetchBalance();
      setTimeout(() => setStep("idle"), 1500);
    } catch (e: unknown) {
      const msg = txErrorMessage(e);
      setError(msg);
      toast.error(msg, { id: "bet" });
      setStep("idle");
    }
  }

  /**
   * Sell existing shares for USDC via the FPMM.
   * @param side          "YES" or "NO"
   * @param sharesIn      raw bigint shares (USDC base units — 6dp)
   * @param previewGross  Optional preview from previewSell(); used for slippage floor (pre-fee).
   */
  async function sell(side: BetSide, sharesIn: bigint, previewGross?: bigint) {
    setError(null);
    if (!address) {
      const msg = "Connect wallet first";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (sharesIn <= 0n) {
      toast.error("Sell amount must be positive");
      return;
    }

    // Protocol applies fee on top of gross; slippage guard is on *post-fee* amountOut.
    // Here we pass minAmountOut = (previewGross * (1 - fee))·(1 - slippage). With 1.5% fee + 1% slippage ≈ preview·0.975.
    const minAmountOut = previewGross
      ? withSlippage((previewGross * 9_850n) / 10_000n) // subtract 1.5% fee first
      : 0n;

    try {
      setStep("selling");
      toast.loading(`Selling ${side}…`, { id: "bet" });
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: "sell",
        args: [side === "YES", sharesIn, minAmountOut],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });

      setStep("done");
      toast.success(`${side} shares sold`, { id: "bet" });
      await refetchBalance();
      setTimeout(() => setStep("idle"), 1500);
    } catch (e: unknown) {
      const msg = txErrorMessage(e);
      setError(msg);
      toast.error(msg, { id: "bet" });
      setStep("idle");
    }
  }

  async function claimWinnings() {
    setError(null);
    try {
      toast.loading("Claiming winnings…", { id: "claim" });
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: "claimWinnings",
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Winnings claimed", { id: "claim" });
      await refetchBalance();
    } catch (e: unknown) {
      const msg = txErrorMessage(e);
      setError(msg);
      toast.error(msg, { id: "claim" });
    }
  }

  return {
    buy,
    sell,
    claimWinnings,
    step,
    isLoading: step !== "idle",
    usdcBalance: usdcBalance as bigint | undefined,
    balanceLoading,
    error,
    clearError: () => setError(null),
  };
}
