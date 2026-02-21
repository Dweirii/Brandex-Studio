"use client";

import { ShoppingBag } from "lucide-react";

interface BuyCreditsPromptProps {
  needed: number;
  balance: number;
}

const storeUrl =
  process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000";

export function BuyCreditsPrompt({ needed, balance }: BuyCreditsPromptProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-center">
      <p className="text-xs text-destructive mb-1.5">
        You need {needed} credits — you have {balance}.
      </p>
      <a
        href={`${storeUrl}/credits`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <ShoppingBag className="h-3 w-3" />
        Buy more credits
      </a>
    </div>
  );
}
