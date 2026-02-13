"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi, HEAVY_UPLOAD_TIMEOUT_MS } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export function SkinEnhancePanel() {
  const { studioUpload } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, activeImageId, images, addImage, setProcessing, isProcessing } = useStudioStore();

  const [level, setLevel] = useState(5);
  const [preserveTexture, setPreserveTexture] = useState(true);
  const [smoothness, setSmoothness] = useState(5);
  const isSubmittingRef = useRef(false);

  const creditCost = 20;
  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= creditCost;

  const handleEnhance = async () => {
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

    setProcessing(true, "Enhancing skin with AI...");

    try {
      const imageRes = await fetch(activeImage.url);
      if (!imageRes.ok) {
        toast.error("Source Image Unavailable", {
          description: "Could not load the image. It may have expired — try selecting a different one.",
          duration: 6000,
        });
        return;
      }
      const imageBlob = await imageRes.blob();

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("projectId", projectId);
      formData.append("level", level.toString());
      formData.append("preserveTexture", preserveTexture.toString());
      formData.append("smoothness", smoothness.toString());
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/skin-enhance", formData, { timeoutMs: HEAVY_UPLOAD_TIMEOUT_MS });

      addImage({
        id: result.id,
        type: result.type,
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Skin enhanced successfully!");
    } catch (error) {
      handleError(error, { operation: "enhance skin" });
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
          <Sparkles className="h-4 w-4" />
          <h3 className="font-semibold">Enhance Skin</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Professional skin enhancement for portraits
        </p>
      </div>

      {/* Info Alert */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Best for portrait photos. Preserves natural appearance while smoothing and improving skin quality.
        </p>
      </div>

      {/* Enhancement Level */}
      <div className="space-y-2">
        <Label htmlFor="skin-level">
          Enhancement Level: {level}
        </Label>
        <Input
          id="skin-level"
          type="range"
          min={0}
          max={10}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) || 5)}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground">
          Higher values = more enhancement
        </p>
      </div>

      {/* Smoothness */}
      <div className="space-y-2">
        <Label htmlFor="skin-smoothness">
          Smoothness: {smoothness}
        </Label>
        <Input
          id="skin-smoothness"
          type="range"
          min={0}
          max={10}
          value={smoothness}
          onChange={(e) => setSmoothness(Number(e.target.value) || 5)}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground">
          Controls skin smoothing intensity
        </p>
      </div>

      {/* Preserve Texture */}
      <div className="flex items-center space-x-2 rounded-lg border bg-card p-3">
        <Checkbox
          id="preserve-texture"
          checked={preserveTexture}
          onCheckedChange={(checked) => setPreserveTexture(checked as boolean)}
        />
        <div className="flex-1">
          <Label htmlFor="preserve-texture" className="cursor-pointer font-medium">
            Preserve Natural Texture
          </Label>
          <p className="text-xs text-muted-foreground">
            Keeps skin looking natural and realistic
          </p>
        </div>
      </div>

      {/* Enhance Button */}
      <Button
        onClick={handleEnhance}
        disabled={isProcessing || !activeImage || !canAfford}
        className="w-full"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {!canAfford ? "Not enough credits" : `Enhance (${creditCost} credits)`}
      </Button>

      {!canAfford && (
        <p className="text-center text-xs text-destructive">
          You need {creditCost} credits. Current balance: {balance}
        </p>
      )}
    </div>
  );
}
