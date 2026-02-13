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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Paintbrush, RotateCcw, Coins, Minus, Plus } from "lucide-react";
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
  const editMode = useMaskPainterStore((s) => s.editMode);
  const prompt = useMaskPainterStore((s) => s.prompt);
  const setBrushSize = useMaskPainterStore((s) => s.setBrushSize);
  const setEditMode = useMaskPainterStore((s) => s.setEditMode);
  const setPrompt = useMaskPainterStore((s) => s.setPrompt);

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

  // ── Apply edit ──────────────────────────────────────────────────────────────

  const handleApply = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!activeImage || !projectId) {
      toast.error("Please select an image first");
      isSubmittingRef.current = false;
      return;
    }

    if (!hasMask) {
      toast.error("Paint Over the Area", {
        description:
          "Brush over the part of the image you want to edit, then try again.",
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    if (editMode === "edit" && !prompt.trim()) {
      toast.error("Describe Your Edit", {
        description:
          'Tell us what you want — e.g. "change to red", "make it leather".',
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    // ── IMPORTANT: capture the mask BEFORE setProcessing ──────────────────
    // setProcessing(true) triggers a re-render in page.tsx that unmounts
    // and remounts Canvas, which destroys the mask canvas from the DOM.
    // So we grab everything we need from the DOM first.

    const maskCanvas = getMaskCanvas();
    if (!maskCanvas) {
      toast.error("No Mask Found", {
        description: "Paint over the area you want to edit, then try again.",
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

    const actionLabel =
      editMode === "remove" ? "Removing selected area..." : "Applying AI edit...";
    setProcessing(true, actionLabel);

    try {
      // 1. Fetch the source image as a blob
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

      // 2. Build FormData and send to backend
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("projectId", projectId);
      formData.append("editMode", editMode);
      formData.append("parentId", activeImage.id);
      if (editMode === "edit") {
        formData.append("prompt", prompt.trim());
      } else {
        formData.append("prompt", "remove the selected object, fill with the surrounding background");
      }

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/ai-edit", formData);

      addImage({
        id: result.id,
        type: result.type || "ai_edited",
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);

      // Reset mask state
      handleClearMask();
      useMaskPainterStore.getState().setPrompt("");
      toast.success(
        editMode === "remove"
          ? "Object removed successfully!"
          : "Edit applied successfully!"
      );
    } catch (error) {
      handleError(error, {
        operation: editMode === "remove" ? "remove object" : "apply AI edit",
      });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [
    activeImage,
    projectId,
    hasMask,
    editMode,
    prompt,
    setProcessing,
    studioUpload,
    addImage,
    setBalanceFromResponse,
    handleClearMask,
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Paintbrush className="h-4 w-4" />
            AI Edit
          </CardTitle>
          <CardDescription>
            Paint over the area you want to change, then describe your edit.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Edit Mode ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Edit Mode</Label>
        <RadioGroup
          value={editMode}
          onValueChange={(v) => setEditMode(v as "edit" | "remove")}
        >
          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem
              value="edit"
              id="mode-edit"
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="mode-edit" className="cursor-pointer font-medium">
                Edit / Recolor
              </Label>
              <p className="text-xs text-muted-foreground">
                Change color, material, or appearance of the selected area
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem
              value="remove"
              id="mode-remove"
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="mode-remove"
                className="cursor-pointer font-medium"
              >
                Remove
              </Label>
              <p className="text-xs text-muted-foreground">
                Remove the selected object and fill with background
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* ── Prompt (only for edit mode) ───────────────────────────────── */}
      {editMode === "edit" && (
        <div className="space-y-2">
          <Label htmlFor="edit-prompt">Describe Your Edit</Label>
          <Textarea
            id="edit-prompt"
            placeholder='e.g. "change the shirt to red", "make it a leather jacket", "add floral pattern"...'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={2000}
            className="resize-none"
          />
        </div>
      )}

      {/* ── Brush Size ────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label>Brush Size</Label>
          <span className="font-mono text-xs text-white/50 tabular-nums">
            {brushSize}px
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
            onClick={() => setBrushSize(Math.max(5, brushSize - 5))}
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="studio-slider flex-1"
            style={{
              background: `linear-gradient(to right, rgba(0,235,2,0.4) 0%, rgba(0,235,2,0.4) ${((brushSize - 5) / 95) * 100}%, rgba(255,255,255,0.08) ${((brushSize - 5) / 95) * 100}%, rgba(255,255,255,0.08) 100%)`,
            }}
          />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
            onClick={() => setBrushSize(Math.min(100, brushSize + 5))}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Mask indicator ────────────────────────────────────────────── */}
      {hasMask && (
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-primary/80">
              Area selected — ready to edit
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
          disabled={
            !activeImage ||
            isProcessing ||
            !canAfford ||
            !hasMask ||
            (editMode === "edit" && !prompt.trim())
          }
          onClick={handleApply}
        >
          {!canAfford
            ? "Not enough credits"
            : !hasMask
            ? "Paint an area first"
            : editMode === "edit" && !prompt.trim()
            ? "Describe your edit above"
            : editMode === "remove"
            ? "Remove Selected"
            : "Apply Edit"}
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
      <div className="rounded-xl bg-white/[0.03] p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">How it works:</span>{" "}
          Paint over the area you want to change using the brush. Use{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            [
          </kbd>{" "}
          and{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            ]
          </kbd>{" "}
          to resize the brush. The AI will only modify the painted area.
        </p>
      </div>
    </div>
  );
}
