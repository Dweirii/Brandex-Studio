"use client";

import { useRef, useCallback } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import {
  useMaskPainterStore,
  getMaskCanvas,
  exportMaskAsBlob,
} from "@/hooks/use-mask-painter";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eraser, RotateCcw, Coins, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

const COST = 25;

export function AiEditPanel() {
  const { studioUpload } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const {
    projectId,
    activeImageId,
    images,
    isProcessing,
    setProcessing,
    addImage,
  } = useStudioStore();
  const isSubmittingRef = useRef(false);

  const brushSize = useMaskPainterStore((s) => s.brushSize);
  const hasMask = useMaskPainterStore((s) => s.hasMask);
  const setBrushSize = useMaskPainterStore((s) => s.setBrushSize);

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  // ── Clear the mask ──────────────────────────────────────────────────────────

  const handleClearMask = useCallback(() => {
    const maskCanvas = getMaskCanvas();
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    useMaskPainterStore.getState().setHasMask(false);
  }, []);

  // ── Apply ─────────────────────────────────────────────────────────────────

  const handleApply = useCallback(async () => {
    if (isSubmittingRef.current || !activeImage || !projectId) return;
    isSubmittingRef.current = true;

    if (!hasMask) {
      toast.error("Paint Over the Area", {
        description: "Brush over the object you want to remove, then try again.",
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    // Capture mask BEFORE setProcessing (which remounts Canvas)
    const maskCanvas = getMaskCanvas();
    if (!maskCanvas) {
      toast.error("No Mask Found", {
        description: "Paint over the area you want to remove, then try again.",
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    let maskBlob: Blob;
    try {
      maskBlob = await exportMaskAsBlob(
        maskCanvas,
        activeImage.width || 1024,
        activeImage.height || 1024
      );
    } catch {
      toast.error("Failed to export mask. Please try again.");
      isSubmittingRef.current = false;
      return;
    }

    setProcessing(true, "Removing selected area...");

    try {
      const imageRes = await fetch(activeImage.url);
      if (!imageRes.ok) {
        toast.error("Source Image Unavailable", {
          description:
            "Could not load the image. It may have expired — try selecting a different one.",
          duration: 6000,
        });
        return;
      }
      const imageBlob = await imageRes.blob();

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("projectId", projectId);
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/ai-remove", formData);

      addImage({
        id: result.id,
        type: result.type || "ai_edited",
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      handleClearMask();
      toast.success("Object removed successfully!");
    } catch (error) {
      handleError(error, { operation: "remove object" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [
    activeImage,
    projectId,
    hasMask,
    setProcessing,
    studioUpload,
    addImage,
    setBalanceFromResponse,
    handleClearMask,
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eraser className="h-4 w-4" />
            AI Remover
          </CardTitle>
          <CardDescription>
            Paint over any object to erase it from the image. The AI will
            cleanly fill the area with the surrounding background.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Brush Size ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Brush Size</Label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-white/50 tabular-nums">
              {brushSize}px
            </span>
            <div className="flex items-center gap-1">
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/6 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                onClick={() => setBrushSize(Math.max(5, brushSize - 5))}
                title="Decrease brush size ([)"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/6 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                onClick={() => setBrushSize(Math.min(100, brushSize + 5))}
                title="Increase brush size (])"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={1}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="studio-slider w-full"
          style={{
            background: `linear-gradient(to right, rgba(0,235,2,0.4) 0%, rgba(0,235,2,0.4) ${((brushSize - 5) / 95) * 100}%, rgba(255,255,255,0.08) ${((brushSize - 5) / 95) * 100}%, rgba(255,255,255,0.08) 100%)`,
          }}
        />
      </div>

      {/* ── Mask indicator ────────────────────────────────────────────── */}
      {hasMask && (
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-primary/80">
              Area selected — ready to remove
            </span>
          </div>
          <button
            className="text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors"
            onClick={handleClearMask}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <Button
          className="w-full"
          size="lg"
          disabled={!activeImage || isProcessing || !canAfford || !hasMask}
          onClick={handleApply}
        >
          {!canAfford
            ? "Not enough credits"
            : !hasMask
            ? "Paint an area first"
            : "Remove Selected"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!hasMask}
          onClick={handleClearMask}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Clear Selection
        </Button>
      </div>

      {/* ── Cost ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Cost</span>
        <span className="flex items-center gap-1 font-medium">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          {COST} credits
        </span>
      </div>

      {!canAfford && (
        <p className="text-center text-xs text-destructive">
          You need {COST} credits. Current balance: {balance}
        </p>
      )}

      {/* ── Tip ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white/3 p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">How it works:</span>{" "}
          Paint over the object you want to remove. Use{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            [
          </kbd>{" "}
          and{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            ]
          </kbd>{" "}
          to resize the brush. The AI will cleanly erase the painted area.
        </p>
      </div>
    </div>
  );
}
