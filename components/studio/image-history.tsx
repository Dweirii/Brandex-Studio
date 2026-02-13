/**
 * Image History Panel
 * Shows version history tree with visual timeline
 */

"use client";

import { useEffect } from "react";
import { useImageHistory, type HistoryImage } from "@/hooks/use-image-history";
import { useStudioStore } from "@/stores/use-studio-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ArrowRight, X, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";

interface ImageHistoryPanelProps {
  imageId: string;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  original: "Original",
  bg_removed: "BG Removed",
  ai_background: "AI Background",
  generated: "Generated",
  typography: "Typography",
  upscaled: "Upscaled",
  relit: "Relit",
  skin_enhanced: "Skin Enhanced",
  exported: "Exported",
};

export function ImageHistoryPanel({ imageId, onClose }: ImageHistoryPanelProps) {
  const { history, isLoading, fetchHistory } = useImageHistory();
  const setActiveImage = useStudioStore((s) => s.setActiveImage);

  useEffect(() => {
    fetchHistory(imageId).catch((error) => {
      handleError(error, { operation: "load version history" });
    });
  }, [imageId, fetchHistory]);

  const handleSelectVersion = (versionId: string) => {
    setActiveImage(versionId);
    toast.success("Switched to selected version");
  };

  return (
    <div className="relative w-80 bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-right-5 duration-300">
      <div className="relative flex items-center justify-between px-5 py-4 mb-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/40">
            History
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:rotate-90"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative p-5 overflow-y-auto max-h-[calc(100vh-14rem)] scrollbar-thin">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-lg bg-white/[0.04]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-white/[0.06]" />
                  <Skeleton className="h-3 w-1/2 bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : history && history.chain.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/60 mb-3">Version Chain</h3>
            {history.chain.map((version, index) => (
              <div key={version.id} className="relative">
                {/* Arrow connector */}
                {index < history.chain.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-px bg-primary/30" />
                )}

                <button
                  onClick={() => handleSelectVersion(version.id)}
                  className={cn(
                    "group relative flex w-full gap-3 rounded-xl p-3 text-left transition-all duration-300",
                    version.id === imageId
                      ? "bg-primary/10 shadow-[0_0_8px_0_rgba(0,0,0,0.4)]"
                      : "hover:bg-white/[0.05]"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg shadow-[0_0_6px_0_rgba(0,0,0,0.4)]">
                    <img
                      src={version.url}
                      alt={typeLabels[version.type] || version.type}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {version.id === imageId && (
                      <div className="absolute inset-0 ring-2 ring-primary rounded-lg" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className={cn(
                        "text-xs font-semibold truncate",
                        version.id === imageId ? "text-primary" : "text-white/80"
                      )}>
                        {typeLabels[version.type] || version.type}
                      </span>
                      {version.creditsCost > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-white/40 shrink-0 ml-2">
                          <Coins className="h-2.5 w-2.5" />
                          {version.creditsCost}
                        </span>
                      )}
                    </div>
                    {version.operation && (
                      <p className="text-[10px] text-white/40 capitalize truncate">
                        {version.operation.replace(/_/g, " ")}
                      </p>
                    )}
                    {version.provider && (
                      <p className="text-[10px] text-white/30 capitalize mt-0.5">
                        via {version.provider}
                      </p>
                    )}
                  </div>
                </button>

                {/* Arrow indicator */}
                {index < history.chain.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <ArrowRight className="h-3 w-3 text-primary/50" />
                  </div>
                )}
              </div>
            ))}

            {/* Descendants */}
            {history.descendants.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-white/60 mb-3">Derived Versions</h3>
                <div className="space-y-2">
                  {history.descendants.map((descendant) => (
                    <button
                      key={descendant.id}
                      onClick={() => handleSelectVersion(descendant.id)}
                      className="flex w-full gap-3 rounded-xl p-3 text-left transition-all duration-300 hover:bg-white/[0.05]"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-[0_0_6px_0_rgba(0,0,0,0.4)]">
                        <img
                          src={descendant.url}
                          alt={typeLabels[descendant.type] || descendant.type}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white/80 truncate block">
                          {typeLabels[descendant.type] || descendant.type}
                        </span>
                        <p className="text-[10px] text-white/40 capitalize truncate">
                          {descendant.operation?.replace(/_/g, " ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-white/10 mb-3" />
            <p className="text-sm text-white/40">No version history</p>
            <p className="text-xs text-white/30 mt-1">This is the original image</p>
          </div>
        )}
      </div>
    </div>
  );
}
