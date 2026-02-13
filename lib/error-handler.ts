import { toast } from "sonner";
import { StudioApiError } from "@/hooks/use-studio-api";

// ── Types ────────────────────────────────────────────────────────────────────

interface ErrorContext {
  /**
   * A short, human-readable label for the failed operation.
   * Used to build the description: "Unable to {operation}."
   * Examples: "remove background", "upscale image", "generate image"
   */
  operation?: string;
  /** Suppress console.error (default: false) */
  silent?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fallbackDescription(operation?: string) {
  return operation
    ? `Unable to ${operation}. Please try again.`
    : "Something unexpected happened. Please try again.";
}

// ── Main handler ─────────────────────────────────────────────────────────────

/**
 * Centralized, user-friendly error handler for the Studio app.
 *
 * Call this inside every `catch` block to get consistent, rich toast
 * notifications that tell users **what** went wrong and **what to do next**.
 *
 * ```ts
 * try { … }
 * catch (error) { handleError(error, { operation: "remove background" }); }
 * ```
 */
export function handleError(error: unknown, context?: ErrorContext) {
  const { operation, silent } = context ?? {};

  // Always log unless explicitly silenced
  if (!silent) {
    console.error(`[Studio${operation ? ` · ${operation}` : ""}]`, error);
  }

  // ── StudioApiError (our custom server error class) ───────────────────────

  if (error instanceof StudioApiError) {
    // Insufficient credits
    if (error.requiresCredits) {
      toast.error("Insufficient Credits", {
        description:
          "You don't have enough credits for this action. Top up to keep creating.",
        duration: 8000,
      });
      return;
    }

    // Not authenticated / session expired
    if (error.status === 401) {
      toast.error("Session Expired", {
        description:
          "Your session has expired. Please sign in again to continue.",
        duration: 6000,
      });
      return;
    }

    // Forbidden
    if (error.status === 403) {
      toast.error("Access Denied", {
        description:
          "You don't have permission to perform this action.",
        duration: 6000,
      });
      return;
    }

    // Timeout
    if (error.status === 408) {
      toast.error("Request Timed Out", {
        description:
          "This is taking longer than expected. Please try again — if the issue persists, try with a smaller image.",
        duration: 8000,
      });
      return;
    }

    // Rate limited
    if (error.status === 429) {
      toast.error("Slow Down", {
        description:
          "You're sending requests too quickly. Please wait a moment and try again.",
        duration: 6000,
      });
      return;
    }

    // Payload too large
    if (error.status === 413) {
      toast.error("File Too Large", {
        description:
          "The image you're trying to upload exceeds the size limit. Please use a smaller file.",
        duration: 6000,
      });
      return;
    }

    // Server error (5xx)
    if (error.status >= 500) {
      toast.error("Server Error", {
        description:
          "Something went wrong on our end. Please try again in a few moments.",
        duration: 6000,
      });
      return;
    }

    // Network unreachable (status 0 = fetch itself failed)
    if (error.status === 0 && !error.message.includes("not configured")) {
      toast.error("Connection Lost", {
        description:
          "Unable to reach our servers. Please check your internet connection and try again.",
        duration: 8000,
      });
      return;
    }

    // Fallback for other StudioApiError codes — use the server's message
    toast.error("Something Went Wrong", {
      description: error.message || fallbackDescription(operation),
      duration: 6000,
    });
    return;
  }

  // ── Standard Error objects ───────────────────────────────────────────────

  if (error instanceof Error) {
    // Network / fetch errors (e.g. offline, DNS failure)
    if (
      error.name === "TypeError" &&
      (error.message.includes("fetch") || error.message.includes("network"))
    ) {
      toast.error("Connection Lost", {
        description:
          "Unable to reach our servers. Please check your internet connection and try again.",
        duration: 8000,
      });
      return;
    }

    // AbortError (request cancelled — usually by timeout or navigation)
    if (error.name === "AbortError") {
      toast.error("Request Cancelled", {
        description:
          "The operation was interrupted. Please try again.",
        duration: 5000,
      });
      return;
    }

    // Other known Error — use its message
    toast.error("Something Went Wrong", {
      description: error.message || fallbackDescription(operation),
      duration: 6000,
    });
    return;
  }

  // ── Unknown throw (string, number, etc.) ─────────────────────────────────

  toast.error("Something Went Wrong", {
    description: fallbackDescription(operation),
    duration: 6000,
  });
}
