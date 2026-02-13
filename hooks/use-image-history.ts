/**
 * Image History Hook
 * Fetches and manages version history for images.
 * Includes abort logic to prevent stale responses on rapid switching.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useStudioApi } from "./use-studio-api";

export interface HistoryImage {
  id: string;
  type: string;
  url: string;
  operation?: string | null;
  provider?: string | null;
  prompt?: string | null;
  creditsCost: number;
  parentId?: string | null;
  createdAt: string;
  fileFormat?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface ImageHistory {
  chain: HistoryImage[];
  descendants: HistoryImage[];
}

export function useImageHistory() {
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ImageHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { studioRequest } = useStudioApi();
  const currentRequestIdRef = useRef<string | null>(null);

  const fetchHistory = useCallback(
    async (imageId: string) => {
      if (!imageId) return;

      // Track which request ID is current to discard stale responses
      const requestId = imageId;
      currentRequestIdRef.current = requestId;

      setIsLoading(true);
      setError(null);

      try {
        const data = await studioRequest<ImageHistory>(
          `/images/${imageId}/history`
        );

        // Only update state if this is still the most recent request
        if (currentRequestIdRef.current === requestId) {
          setHistory(data);
        }
        return data;
      } catch (err) {
        if (currentRequestIdRef.current === requestId) {
          const message = err instanceof Error ? err.message : "Failed to load history";
          setError(message);
          console.error("[ImageHistory] Fetch error:", err);
        }
        throw err;
      } finally {
        if (currentRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [studioRequest]
  );

  const clearHistory = useCallback(() => {
    setHistory(null);
    setError(null);
    currentRequestIdRef.current = null;
  }, []);

  return {
    history,
    isLoading,
    error,
    fetchHistory,
    clearHistory,
  };
}
