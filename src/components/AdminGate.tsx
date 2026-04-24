"use client";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, Shield, LogOut } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_ADDRESS } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";

type GateState = "loading" | "signed-in" | "signed-out";

/**
 * Hard-gate the admin surface: until the wallet has proven ownership of
 * NEXT_PUBLIC_ADMIN_ADDRESS via a signed message, children are not rendered.
 * The `/api/auth/verify` endpoint also enforces this server-side — this
 * component just handles the UX.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<GateState>("loading");
  const [sessionAddr, setSessionAddr] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Manual refresh (used after sign-in / sign-out clicks).
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await r.json()) as { address?: string | null };
      if (data.address) {
        setSessionAddr(data.address);
        setState("signed-in");
      } else {
        setSessionAddr(null);
        setState("signed-out");
      }
    } catch {
      setSessionAddr(null);
      setState("signed-out");
    }
  }, []);

  // Initial session check on mount. Cancel-safe: if the component unmounts
  // before the fetch resolves we drop the result instead of setting state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await r.json()) as { address?: string | null };
        if (cancelled) return;
        if (data.address) {
          setSessionAddr(data.address);
          setState("signed-in");
        } else {
          setSessionAddr(null);
          setState("signed-out");
        }
      } catch {
        if (cancelled) return;
        setSessionAddr(null);
        setState("signed-out");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async () => {
    if (!address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (address.toLowerCase() !== ADMIN_ADDRESS) {
      toast.error("This wallet is not the configured admin");
      return;
    }
    setSigningIn(true);
    try {
      // 1. Nonce + canonical message from the server.
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error((await nonceRes.json()).error ?? "nonce failed");
      const { message } = (await nonceRes.json()) as { nonce: string; message: string };

      // 2. Sign the message.
      toast.loading("Waiting for wallet signature…", { id: "signin" });
      const signature = await signMessageAsync({ message });

      // 3. Submit for verification.
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, message, signature }),
      });
      const data = (await verifyRes.json()) as { ok?: boolean; error?: string };
      if (!verifyRes.ok || !data.ok) {
        throw new Error(data.error ?? `verify failed (${verifyRes.status})`);
      }

      toast.success("Signed in as admin", { id: "signin" });
      await refreshSession();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Sign-in failed: ${msg}`, { id: "signin" });
    } finally {
      setSigningIn(false);
    }
  }, [address, signMessageAsync, refreshSession]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionAddr(null);
    setState("signed-out");
    toast.success("Signed out");
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[#8b96a5]" />
      </div>
    );
  }

  if (state === "signed-out") {
    const walletIsAdmin = address && address.toLowerCase() === ADMIN_ADDRESS;
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-[4px] border border-[#1f2630] bg-[#131820] p-6">
          <div className="flex items-center gap-[8px] mb-3">
            <Shield className="h-[18px] w-[18px] text-[#f59e0b]" />
            <span className="mono label text-[#f59e0b]">Admin · sign-in required</span>
          </div>
          <h1 className="m-0 text-[18px] font-semibold tracking-[-0.3px] text-[#f3f4f6] mb-2">
            Sign in with the admin wallet
          </h1>
          <p className="m-0 text-[13px] leading-[1.6] text-[#8b96a5] mb-5">
            Connect the wallet at{" "}
            <span className="mono text-[#f3f4f6]">{shortenAddress(ADMIN_ADDRESS || "0x0")}</span>{" "}
            and sign a message. The signature is verified on the server before any
            admin metrics, creation tools, or resolution controls load.
          </p>

          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton showBalance={false} />
            </div>
          ) : !walletIsAdmin ? (
            <div className="rounded-[3px] border border-[#ef4444]/40 bg-[#ef4444]/10 p-3 text-[12px] text-[#ef4444]">
              Connected wallet ({shortenAddress(address ?? "")}) is not the admin.
              Switch to the admin wallet in your wallet extension.
            </div>
          ) : (
            <button
              onClick={signIn}
              disabled={signingIn}
              className="w-full rounded-[4px] border-none bg-gradient-to-r from-[#3b82f6] to-[#a855f7] px-4 py-[11px] text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {signingIn ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Signing…
                </span>
              ) : (
                "Sign in with wallet"
              )}
            </button>
          )}

          <p className="mt-4 mono text-[10px] tracking-[0.1em] uppercase text-[#6b7280] text-center">
            Session lasts 4 hours · signature is free (no gas)
          </p>
        </div>
      </div>
    );
  }

  // state === "signed-in"
  const mismatch = sessionAddr && address && sessionAddr.toLowerCase() !== address.toLowerCase();
  return (
    <>
      {mismatch && (
        <div className="mx-4 sm:mx-6 lg:mx-8 my-3 rounded-[4px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-3 text-[12px] text-[#f59e0b]">
          Signed in as {shortenAddress(sessionAddr ?? "")} but connected wallet is{" "}
          {shortenAddress(address ?? "")}. On-chain writes use the connected wallet;
          sign out and sign in again with the correct wallet.
        </div>
      )}
      <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-3">
        <button
          onClick={signOut}
          className="flex items-center gap-[6px] rounded-[3px] border border-[#1f2630] bg-[#131820] px-[10px] py-[5px] text-[11px] mono text-[#8b96a5] hover:text-[#f3f4f6] hover:border-[#2a3340] transition-colors"
        >
          <LogOut className="h-[11px] w-[11px]" />
          Sign out
          <span className="text-[#3a4250]">·</span>
          <span>{shortenAddress(sessionAddr ?? "")}</span>
        </button>
      </div>
      {children}
    </>
  );
}
