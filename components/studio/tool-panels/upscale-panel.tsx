"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi, StudioApiError } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ZoomIn, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function UpscalePanel() {
  const { studioUpload } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, activeImageId, images, addImage, setProcessing, isProcessing } = useStudioStore();

  const [mode, setMode] = useState<"precision" | "creative">("precision");
  const [scaleFactor, setScaleFactor] = useState<2 | 4>(2);
  const isSubmittingRef = useRef(false);

  const creditCost = mode === "creative" ? 30 : 20;
  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= creditCost;

  /**
   * Load image dimensions from a URL. Returns { width, height }.
   */
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Failed to load image dimensions"));
      img.src = url;
    });

  const FREEPIK_MAX_OUTPUT_PIXELS = 25_300_000;

  const handleUpscale = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!activeImage) {
      toast.error("Please select an image first");
      isSubmittingRef.current = false;
      return;
    }

    if (!projectId) {
      toast.error("No project selected");
      isSubmittingRef.current = false;
      return;
    }

    // Pre-validate image dimensions against Freepik's pixel limit
    try {
      const { width, height } = await getImageDimensions(activeImage.url);
      const outputPixels = (width * scaleFactor) * (height * scaleFactor);

      if (outputPixels > FREEPIK_MAX_OUTPUT_PIXELS) {
        const maxInput = Math.floor(Math.sqrt(FREEPIK_MAX_OUTPUT_PIXELS / (scaleFactor * scaleFactor)));
        if (scaleFactor === 4) {
          toast.error(
            `Image too large for 4x upscale (${width}x${height} → ${width * 4}x${height * 4}). Try 2x instead.`
          );
        } else {
          toast.error(
            `Image too large for ${scaleFactor}x upscale (${width}x${height}). Max ~${maxInput}x${maxInput} pixels.`
          );
        }
        isSubmittingRef.current = false;
        return;
      }
    } catch {
      // If dimension check fails, proceed anyway — backend will catch it
    }

    setProcessing(true, `Upscaling image (${mode} ${scaleFactor}x)...`);

    try {
      const imageRes = await fetch(activeImage.url);
      if (!imageRes.ok) {
        toast.error("Failed to load the source image. Please try selecting a different image.");
        return;
      }
      const imageBlob = await imageRes.blob();

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("projectId", projectId);
      formData.append("mode", mode);
      formData.append("scaleFactor", scaleFactor.toString());
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/upscale", formData);

      addImage({
        id: result.id,
        type: result.type,
        parentId: activeImage.id,
        url: result.url,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Image upscaled successfully!");
    } catch (error) {
      console.error("[Upscale] Error:", error);
      if (error instanceof StudioApiError && error.requiresCredits) {
        toast.error("Insufficient credits. Please purchase more credits.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to upscale image");
      }
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ZoomIn className="h-4 w-4" />
          <h3 className="font-semibold">Upscale Image</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Enhance resolution and quality with AI
        </p>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <Label>Upscale Mode</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "precision" | "creative")}>
          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem value="precision" id="mode-precision" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-precision" className="cursor-pointer font-medium">
                Precision
              </Label>
              <p className="text-xs text-muted-foreground">
                Preserves exact details (20 credits)
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem value="creative" id="mode-creative" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-creative" className="cursor-pointer font-medium">
                Creative
              </Label>
              <p className="text-xs text-muted-foreground">
                Enhances & adds details (30 credits)
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Scale Factor */}
      <div className="space-y-3">
        <Label>Scale Factor</Label>
        <RadioGroup 
          value={scaleFactor.toString()} 
          onValueChange={(v) => setScaleFactor(Number(v) === 4 ? 4 : 2)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2" id="scale-2x" />
            <Label htmlFor="scale-2x" className="cursor-pointer">2x Resolution</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="4" id="scale-4x" />
            <Label htmlFor="scale-4x" className="cursor-pointer">4x Resolution</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Upscale Button */}
      <Button
        onClick={handleUpscale}
        disabled={isProcessing || !activeImage || !canAfford}
        className="w-full"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {!canAfford ? "Not enough credits" : `Upscale (${creditCost} credits)`}
      </Button>

      {!canAfford && (
        <p className="text-center text-xs text-destructive">
          You need {creditCost} credits. Current balance: {balance}
        </p>
      )}
    </div>
  );
}
