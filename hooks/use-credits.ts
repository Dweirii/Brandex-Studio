"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  return { balance, isLoading, error, refresh, setBalanceFromResponse };
}
