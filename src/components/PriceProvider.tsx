"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { fetchPrices, type PriceMap } from "@/lib/coingecko";

interface PriceContextValue {
  prices: PriceMap | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const PriceContext = createContext<PriceContextValue | null>(null);

const POLL_MS = 30_000;

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastFetched = useRef(0);

  async function load() {
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      try {
        const data = await fetchPrices();
        setPrices(data);
        setError(null);
        lastFetched.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = p;
    return p;
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      timer = setTimeout(tick, POLL_MS);
    };

    const tick = async () => {
      if (cancelled) return;
      await load();
      scheduleNext();
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) { clearTimeout(timer); timer = null; }
        return;
      }
      const age = Date.now() - lastFetched.current;
      if (age >= POLL_MS) void tick();
      else scheduleNext();
    };

    void tick();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <PriceContext.Provider value={{ prices, loading, error, refresh: load }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices(): PriceContextValue {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error("usePrices must be used inside <PriceProvider>");
  return ctx;
}
