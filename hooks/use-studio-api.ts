"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window !== "undefined") {
  console.error("[StudioAPI] NEXT_PUBLIC_API_URL is not configured!");
}

/** Default timeout for JSON requests (4 minutes for AI generation operations) */
const DEFAULT_TIMEOUT_MS = 240_000;
/** Default timeout for file uploads (3 minutes) */
const UPLOAD_TIMEOUT_MS = 180_000;

/**
 * Custom error class that preserves server-side error metadata
 * (e.g. requiresCredits flag for insufficient credit errors).
 */
export class StudioApiError extends Error {
  requiresCredits: boolean;
  status: number;

  constructor(message: string, status: number, requiresCredits = false) {
    super(message);
    this.name = "StudioApiError";
    this.requiresCredits = requiresCredits;
    this.status = status;
  }
}

export function useStudioApi() {
  const { getToken } = useAuth();

  /**
   * Make an authenticated JSON request to the Studio API.
   * Includes timeout handling and preserves server error metadata.
   */
  const studioRequest = useCallback(
    async <T = unknown>(
      path: string,
      options: RequestInit = {}
    ): Promise<T> => {
      if (!API_URL) throw new StudioApiError("API URL not configured", 0);

      const token = await getToken({ template: "CustomerJWTBrandex" });
      if (!token) throw new StudioApiError("Not authenticated", 401);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      const url = `${API_URL}/studio${path}`;

      try {
        const hasBody = options.body !== undefined;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          ...(options.headers as Record<string, string> || {}),
        };

        // Only set Content-Type for requests with a body
        if (hasBody && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }

        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Request failed" }));
          throw new StudioApiError(
            errorData.error || `API error: ${res.status}`,
            res.status,
            errorData.requiresCredits ?? false
          );
        }

        // Handle 204 No Content
        if (res.status === 204) {
          return undefined as T;
        }

        return res.json();
      } catch (error) {
        if (error instanceof StudioApiError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new StudioApiError(
            "Request timed out. The operation is taking too long — please try again.",
            408
          );
        }
        throw new StudioApiError(
          error instanceof Error ? error.message : "Network error",
          0
        );
      } finally {
        clearTimeout(timeout);
      }
    },
    [getToken]
  );

  /**
   * Upload a file to the Studio API (multipart/form-data).
   * Does NOT set Content-Type — lets the browser set boundary.
   * Has a longer timeout for file uploads.
   */
  const studioUpload = useCallback(
    async <T = unknown>(
      path: string,
      formData: FormData
    ): Promise<T> => {
      if (!API_URL) throw new StudioApiError("API URL not configured", 0);

      const token = await getToken({ template: "CustomerJWTBrandex" });
      if (!token) throw new StudioApiError("Not authenticated", 401);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      const url = `${API_URL}/studio${path}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new StudioApiError(
            errorData.error || `API error: ${res.status}`,
            res.status,
            errorData.requiresCredits ?? false
          );
        }

        // Handle 204 No Content
        if (res.status === 204) {
          return undefined as T;
        }

        return res.json();
      } catch (error) {
        if (error instanceof StudioApiError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new StudioApiError(
            "Upload timed out. Please try again with a smaller image.",
            408
          );
        }
        throw new StudioApiError(
          error instanceof Error ? error.message : "Network error",
          0
        );
      } finally {
        clearTimeout(timeout);
      }
    },
    [getToken]
  );

  return { studioRequest, studioUpload };
}
