"use client";
import { useAccount } from "wagmi";
import { ADMIN_ADDRESS } from "@/lib/constants";

/**
 * Returns true only when the connected wallet matches the configured admin address.
 * Case-insensitive compare; ADMIN_ADDRESS is already lowercased at definition.
 */
export function useIsAdmin() {
  const { address, isConnected } = useAccount();
  if (!isConnected || !address) return false;
  return address.toLowerCase() === ADMIN_ADDRESS;
}
