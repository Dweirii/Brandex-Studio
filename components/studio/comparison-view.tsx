/**
 * Before/After Comparison View
 * Shows slider and side-by-side comparison modes.
 * 
 * Comparison logic:
 * 1. If active image has a parentId → compare with parent (before/after)
 * 2. Otherwise → compare with the previous image in the gallery
 * 3. Allows manual selection of which image to compare against
 */

"use client";

import { useState, useMemo } from "react";
import ReactCompareImage from "react-compare-image";
import { useStudioStore } from "@/stores/use-studio-store";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Columns2, X, ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ComparisonMode = "slider" | "sideBySide";

export function ComparisonView() {
  const images = useStudioStore((s) => s.images);
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const canvasBackground = useStudioStore((s) => s.canvasBackground);
  const setShowComparison = useStudioStore((s) => s.setShowComparison);
  
  const [mode, setMode] = useState<ComparisonMode>("slider");
  const [swapped, setSwapped] = useState(false);

  const activeImage = images.find((img) => img.id === activeImageId);

  // Find the best "before" image to compare against
  const compareImage = useMemo(() => {
    if (!activeImage) return null;

    // 1. Try parent image first (direct before/after relationship)
    if (activeImage.parentId) {
      const parent = images.find((img) => img.id === activeImage.parentId);
      if (parent) return parent;
    }

    // 2. Fall back to the previous image in the gallery
    const activeIndex = images.findIndex((img) => img.id === activeImageId);
    if (activeIndex > 0) {
      return images[activeIndex - 1];
    }

    // 3. If it's the first image, try the next one
    if (images.length > 1) {
      return images[1];
    }

    return null;
  }, [activeImage, activeImageId, images]);

  if (!activeImage || !compareImage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <ArrowLeftRight className="h-10 w-10 text-white/20" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white/50">No images to compare</p>
          <p className="text-xs text-white/30">Process an image first, then use Compare</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white"
          onClick={() => setShowComparison(false)}
        >
          Back to Canvas
        </Button>
      </div>
    );
  }

  const leftImage = swapped ? activeImage : compareImage;
  const rightImage = swapped ? compareImage : activeImage;

  const getBackgroundClass = () => {
    switch (canvasBackground) {
      case "white": return "bg-white";
      case "black": return "bg-black";
      case "dark": return "bg-[#0a0a0a]";
      default: return "bg-black";
    }
  };

  const leftLabel = swapped ? "After" : "Before";
  const rightLabel = swapped ? "Before" : "After";

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/40">
            Compare
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] text-white/30">C</kbd>
          
          {/* Image labels */}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-semibold text-white/50 bg-white/5 px-2 py-1 rounded-md">
              {leftLabel}: {leftImage.type.replace(/_/g, " ")}
            </span>
            <span className="text-white/20">vs</span>
            <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 px-2 py-1 rounded-md">
              {rightLabel}: {rightImage.type.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Swap button */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSwapped(!swapped)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-300"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                <p className="text-xs font-semibold text-white">Swap sides</p>
              </TooltipContent>
            </Tooltip>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setMode("slider")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300",
                      mode === "slider"
                        ? "bg-primary text-black shadow-sm"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                  <p className="text-xs font-semibold text-white">Slider</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setMode("sideBySide")}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300",
                      mode === "sideBySide"
                        ? "bg-primary text-black shadow-sm"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <Columns2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                  <p className="text-xs font-semibold text-white">Side by Side</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all duration-300"
            onClick={() => setShowComparison(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comparison Content */}
      <div className={cn("relative flex flex-1 items-center justify-center p-8 overflow-hidden", getBackgroundClass())}>
        {mode === "slider" ? (
          <div className="w-full max-w-4xl mx-auto">
            <ReactCompareImage
              leftImage={leftImage.url}
              rightImage={rightImage.url}
              sliderLineColor="#00EB02"
              sliderLineWidth={2}
              handleSize={40}
              hover={false}
              leftImageLabel={leftLabel}
              rightImageLabel={rightLabel}
            />
            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-xs font-semibold text-white/50">{leftLabel}</span>
              <span className="text-xs text-white/30">Drag slider to compare</span>
              <span className="text-xs font-semibold text-primary/70">{rightLabel}</span>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 w-full max-w-6xl mx-auto h-full">
            {/* Left (Before) */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="text-center">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{leftLabel}</span>
                <span className="text-[10px] text-white/25 ml-2">{leftImage.type.replace(/_/g, " ")}</span>
              </div>
              <div className="relative flex-1 flex items-center justify-center min-h-0">
                <img
                  src={leftImage.url}
                  alt={leftLabel}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-[0_0_15px_0_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center">
              <div className="h-3/4 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>

            {/* Right (After) */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="text-center">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">{rightLabel}</span>
                <span className="text-[10px] text-white/25 ml-2">{rightImage.type.replace(/_/g, " ")}</span>
              </div>
              <div className="relative flex-1 flex items-center justify-center min-h-0">
                <img
                  src={rightImage.url}
                  alt={rightLabel}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-[0_0_15px_0_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
