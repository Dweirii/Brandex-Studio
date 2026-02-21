"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Extract the base URL (scheme + host) from the full API_URL so we can call
 * non-studio endpoints like /credits/purchase/checkout.
 * e.g. "http://localhost:3001/api/abc123" → "http://localhost:3001"
 */
const getAdminBaseUrl = () => {
  if (!API_URL) return "";
  const match = API_URL.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : API_URL;
};

const getStoreId = () => {
  if (!API_URL) return "";
  const match = API_URL.match(/\/api\/([^/]+)/);
  return match ? match[1] : "";
};

export function useCredits() {
  const { getToken, isSignedIn } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(async () => {
    // isSignedIn is undefined while Clerk loads — wait for it
    if (isSignedIn === undefined || isSignedIn === false) {
      setBalance(0);
      setIsLoading(false);
      return;
    }

    if (!API_URL) {
      setError("API not configured");
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request to prevent race conditions
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken({ template: "CustomerJWTBrandex" });
      if (!token) {
        setError("Authentication failed");
        setIsLoading(false);
        return;
      }

      const res = await fetch(
        `${API_URL}/credits/balance`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errText = res.status === 401 ? "Session expired" : `Failed to load credits (${res.status})`;
        setError(errText);
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      const newBalance = typeof data.balance === "number" && isFinite(data.balance) && data.balance >= 0
        ? data.balance
        : 0;
      setBalance(newBalance);
      setError(null);
    } catch (err) {
      // Don't set error for aborted requests
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[useCredits] Error fetching balance:", err);
      setError("Failed to load credits");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchBalance();
  }, [fetchBalance]);

  /**
   * Update balance locally after a Studio operation
   * (avoids an extra API call — the route returns newBalance)
   */
  const setBalanceFromResponse = useCallback((newBalance: number) => {
    if (typeof newBalance === "number" && isFinite(newBalance) && newBalance >= 0) {
      setBalance(newBalance);
      setError(null);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchBalance]);

  // Refresh balance when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isSignedIn) {
        fetchBalance();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchBalance, isSignedIn]);

  /**
   * Initiate a Stripe checkout session to purchase credits.
   * Returns the Stripe checkout URL on success, or an error string.
   */
  const purchaseCredits = useCallback(
    async (packId: "PACK_50" | "PACK_100"): Promise<{ url?: string; error?: string }> => {
      try {
        const token = await getToken({ template: "CustomerJWTBrandex" });
        if (!token) return { error: "Please sign in to purchase credits" };

        const adminBase = getAdminBaseUrl();
        const storeId = getStoreId();
        if (!adminBase || !storeId) return { error: "API not configured" };

        const res = await fetch(
          `${adminBase}/api/${storeId}/credits/purchase/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ packId }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Checkout failed (${res.status})`);
        }

        const data = await res.json();
        return { url: data.url };
      } catch (err) {
        console.error("[useCredits] purchaseCredits error:", err);
        return { error: err instanceof Error ? err.message : "Failed to start checkout" };
      }
    },
    [getToken]
  );

  return { balance, isLoading, error, refresh, setBalanceFromResponse, purchaseCredits };
}
