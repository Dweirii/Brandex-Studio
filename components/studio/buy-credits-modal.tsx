"use client";

import { useState, useEffect } from "react";
import { X, Coins, Zap, Star, Loader2, ExternalLink } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";
import { useStudioStore } from "@/stores/use-studio-store";
import { toast } from "sonner";

const PACKS = [
  {
    id: "PACK_50" as const,
    credits: 50,
    price: "$6.99",
    perCredit: "$0.14/credit",
    label: "Starter",
    icon: Zap,
    description: "Great for trying out all tools",
    highlight: false,
  },
  {
    id: "PACK_100" as const,
    credits: 100,
    price: "$11.99",
    perCredit: "$0.12/credit",
    label: "Best Value",
    icon: Star,
    description: "Best price per credit",
    highlight: true,
  },
];

export function BuyCreditsModal() {
  const showBuyCredits = useStudioStore((s) => s.showBuyCredits);
  const setShowBuyCredits = useStudioStore((s) => s.setShowBuyCredits);
  const { balance, purchaseCredits } = useCredits();
  const [loadingPack, setLoadingPack] = useState<"PACK_50" | "PACK_100" | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!showBuyCredits) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowBuyCredits(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBuyCredits, setShowBuyCredits]);

  // Lock scroll when open
  useEffect(() => {
    document.body.style.overflow = showBuyCredits ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showBuyCredits]);

  if (!showBuyCredits) return null;

  const handlePurchase = async (packId: "PACK_50" | "PACK_100") => {
    setLoadingPack(packId);
    const result = await purchaseCredits(packId);
    setLoadingPack(null);

    if (result.error) {
      toast.error("Purchase failed", { description: result.error });
      return;
    }

    if (result.url) {
      // Redirect to Stripe checkout — same tab so they return naturally
      window.location.href = result.url;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buy credits"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setShowBuyCredits(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/8 bg-[#1a1b1e] shadow-[0_0_60px_0_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Buy Credits</h2>
              <p className="text-xs text-white/40">
                Current balance:{" "}
                <span className="text-amber-400 font-semibold">{balance.toLocaleString()} credits</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBuyCredits(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/6 mx-6" />

        {/* Packs */}
        <div className="grid grid-cols-2 gap-3 p-6">
          {PACKS.map((pack) => {
            const Icon = pack.icon;
            const isLoading = loadingPack === pack.id;
            const anyLoading = loadingPack !== null;

            return (
              <div
                key={pack.id}
                className={`relative flex flex-col rounded-xl border p-4 transition-all duration-200 ${
                  pack.highlight
                    ? "border-primary/50 bg-primary/[0.07]"
                    : "border-white/8 bg-white/3"
                }`}
              >
                {pack.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-black tracking-wide">
                    BEST VALUE
                  </div>
                )}

                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      pack.highlight ? "bg-primary/20" : "bg-white/6"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${pack.highlight ? "text-primary" : "text-white/50"}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-white/50">{pack.label}</span>
                </div>

                <p className="text-2xl font-bold text-white mb-0.5">
                  {pack.credits}{" "}
                  <span className="text-sm font-normal text-white/40">credits</span>
                </p>
                <p className="text-lg font-semibold text-white/80 mb-1">{pack.price}</p>
                <p className="text-xs text-white/30 mb-4">{pack.perCredit}</p>

                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={anyLoading}
                  className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    pack.highlight
                      ? "bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
                      : "bg-white/8 text-white hover:bg-white/[0.14] disabled:opacity-50"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Purchase
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-white/6 px-6 py-4">
          <p className="text-center text-[11px] text-white/25 leading-relaxed">
            Secure checkout via Stripe. Credits are added instantly after payment.
          </p>
        </div>
      </div>
    </div>
  );
}
