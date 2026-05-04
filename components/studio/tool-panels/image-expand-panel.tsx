"use client";

import { useState, useRef, useCallback } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";
import { cn } from "@/lib/utils";

const COST = 20;
const MAX_PIXELS = 2000;

type Mode = "smart" | "manual";

export function ImageExpandPanel() {
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

  const [mode, setMode] = useState<Mode>("smart");

  // Smart mode
  const [direction, setDirection] = useState<string>("all");
  const [aspectRatio, setAspectRatio] = useState<string>("original");

  // Manual mode (per-side pixels)
  const [top, setTop] = useState(100);
  const [right, setRight] = useState(100);
  const [bottom, setBottom] = useState(100);
  const [left, setLeft] = useState(100);
  const [linkAll, setLinkAll] = useState(true);

  const [prompt, setPrompt] = useState("");

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  const sourceWidth = activeImage?.width ?? 0;
  const sourceHeight = activeImage?.height ?? 0;
  const finalWidth = sourceWidth + left + right;
  const finalHeight = sourceHeight + top + bottom;
  const hasManualExpansion = top + right + bottom + left > 0;

  const clamp = (n: number) => Math.max(0, Math.min(MAX_PIXELS, Math.floor(n || 0)));

  const setLinked = (value: number) => {
    const v = clamp(value);
    setTop(v);
    setRight(v);
    setBottom(v);
    setLeft(v);
  };

  const handleSideChange = (side: "top" | "right" | "bottom" | "left", value: number) => {
    if (linkAll) {
      setLinked(value);
      return;
    }
    const v = clamp(value);
    if (side === "top") setTop(v);
    if (side === "right") setRight(v);
    if (side === "bottom") setBottom(v);
    if (side === "left") setLeft(v);
  };

  const handleExpand = useCallback(async () => {
    if (isSubmittingRef.current || !activeImage || !projectId) return;
    isSubmittingRef.current = true;

    if (mode === "manual" && !hasManualExpansion) {
      toast.error("Set at least one side", {
        description: "Enter pixels for at least one side before expanding.",
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    setProcessing(true, "Expanding image with AI...");

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
      formData.append("projectId", projectId);
      formData.append("parentId", activeImage.id);
      formData.append("mode", mode);

      if (mode === "smart") {
        formData.append("direction", direction);
        if (aspectRatio && aspectRatio !== "original") {
          formData.append("aspectRatio", aspectRatio);
        }
      } else {
        formData.append("expandTop", String(top));
        formData.append("expandRight", String(right));
        formData.append("expandBottom", String(bottom));
        formData.append("expandLeft", String(left));
      }

      if (prompt.trim()) {
        formData.append("prompt", prompt.trim());
      }

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/image-expand", formData);

      addImage({
        id: result.id,
        type: result.type || "expanded",
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Image expanded successfully!");

      // Reset
      setPrompt("");
    } catch (error) {
      handleError(error, { operation: "expand image" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [
    activeImage,
    projectId,
    mode,
    hasManualExpansion,
    direction,
    aspectRatio,
    top,
    right,
    bottom,
    left,
    prompt,
    setProcessing,
    studioUpload,
    addImage,
    setBalanceFromResponse,
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="text-sm">Image Expansion</CardTitle>
          <CardDescription>
            Extend your image outward with AI-generated content. Choose Smart for
            quick aspect ratios, or Manual for pixel-perfect control.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-1">
        {(["smart", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
              mode === m
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            {m === "smart" ? "Smart" : "Manual (px)"}
          </button>
        ))}
      </div>

      {mode === "smart" ? (
        <>
          {/* Direction */}
          <div className="space-y-2">
            <Label htmlFor="expand-direction">Expand Direction</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger id="expand-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label htmlFor="expand-aspect">Target Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger id="expand-aspect">
                <SelectValue placeholder="Keep original" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Keep original</SelectItem>
                <SelectItem value="1:1">1:1 Square</SelectItem>
                <SelectItem value="16:9">16:9 Landscape</SelectItem>
                <SelectItem value="9:16">9:16 Portrait</SelectItem>
                <SelectItem value="4:3">4:3 Standard</SelectItem>
                <SelectItem value="3:4">3:4 Tall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <>
          {/* Link sides toggle */}
          <button
            type="button"
            onClick={() => setLinkAll((v) => !v)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              linkAll
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-white/[0.03] text-white/55 hover:text-white/80"
            )}
          >
            {linkAll ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
            {linkAll ? "All sides linked" : "Sides independent"}
          </button>

          {/* Image preview with expansion outline */}
          {activeImage?.url && (
            <div className="rounded-md border border-white/[0.06] bg-black/40 p-4">
              <div className="relative mx-auto" style={{ maxWidth: 200 }}>
                {/* Expansion outline (outer rect) */}
                <div
                  className={cn(
                    "relative w-full",
                    hasManualExpansion && "ring-1 ring-dashed ring-primary/40"
                  )}
                  style={{
                    aspectRatio: `${finalWidth || 1} / ${finalHeight || 1}`,
                    background:
                      "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 50% / 12px 12px",
                  }}
                >
                  {/* Original image (inner rect, positioned by side offsets) */}
                  <div
                    className="absolute"
                    style={{
                      left: `${(left / (finalWidth || 1)) * 100}%`,
                      top: `${(top / (finalHeight || 1)) * 100}%`,
                      width: `${(sourceWidth / (finalWidth || 1)) * 100}%`,
                      height: `${(sourceHeight / (finalHeight || 1)) * 100}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeImage.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per-side pixel inputs — stacked, aligned */}
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
            <SideInput
              label="Top"
              value={top}
              onChange={(v) => handleSideChange("top", v)}
            />
            <SideInput
              label="Right"
              value={right}
              onChange={(v) => handleSideChange("right", v)}
            />
            <SideInput
              label="Bottom"
              value={bottom}
              onChange={(v) => handleSideChange("bottom", v)}
            />
            <SideInput
              label="Left"
              value={left}
              onChange={(v) => handleSideChange("left", v)}
            />
          </div>

          {/* Final size */}
          {sourceWidth > 0 && sourceHeight > 0 && (
            <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2 text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-white/45">
                Final size
              </span>
              <span className="font-mono text-white/85 tabular-nums">
                {finalWidth} × {finalHeight} px
              </span>
            </div>
          )}
        </>
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="expand-prompt">Style Guide</Label>
        <Textarea
          id="expand-prompt"
          placeholder="E.g., 'forest background with natural lighting' or leave blank for automatic fill"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          Describe what should fill the new space, or leave blank to let AI match the existing image
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <Button
          className="w-full"
          size="lg"
          disabled={!activeImage || isProcessing || !canAfford}
          onClick={handleExpand}
        >
          {!canAfford ? "Not enough credits" : "Expand Image"}
        </Button>
      </div>

      {/* Cost */}
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Cost</span>
        <span className="font-medium">{COST} credits</span>
      </div>

      {!canAfford && (
        <BuyCreditsPrompt needed={COST} balance={balance} />
      )}

      {/* Tip */}
      <div className="rounded-xl bg-white/3 p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">Tip:</span>{" "}
          {mode === "smart"
            ? "Smart mode picks the best expansion to match your target aspect ratio."
            : "Manual mode adds the exact pixels you specify on each side. Toggle the link icon to adjust sides independently."}
        </p>
      </div>
    </div>
  );
}

function SideInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={MAX_PIXELS}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-20 text-right text-[13px] font-mono tabular-nums"
        />
        <span className="w-5 text-[11px] text-white/35">px</span>
      </div>
    </div>
  );
}
