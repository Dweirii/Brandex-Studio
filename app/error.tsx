"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Studio Error]", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-black text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-sm text-white/50 max-w-md">
          An unexpected error occurred. Your work is safe — try refreshing the page.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-primary/90 hover:scale-105"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
