"use client";

import { useState, useRef, useCallback } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Maximize2, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";

const COST = 20;

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

  const [direction, setDirection] = useState<string>("all");
  const [aspectRatio, setAspectRatio] = useState<string>("original");
  const [prompt, setPrompt] = useState("");

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  const handleExpand = useCallback(async () => {
    if (isSubmittingRef.current || !activeImage || !projectId) return;
    isSubmittingRef.current = true;

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
      formData.append("direction", direction);
      if (aspectRatio && aspectRatio !== "original") {
        formData.append("aspectRatio", aspectRatio);
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
      
      // Reset form
      setPrompt("");
      setDirection("all");
      setAspectRatio("original");
    } catch (error) {
      handleError(error, { operation: "expand image" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [
    activeImage,
    projectId,
    direction,
    aspectRatio,
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
          <CardTitle className="flex items-center gap-2 text-sm">
            <Maximize2 className="h-4 w-4" />
            Image Expansion
          </CardTitle>
          <CardDescription>
            Extend your image outward with AI-generated content. Like Photoshop's
            Generative Expand or Freepik's Expand tool.
          </CardDescription>
        </CardHeader>
      </Card>

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
        <Label htmlFor="expand-aspect">Target Aspect Ratio (Optional)</Label>
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

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="expand-prompt">
          Style Guide (Optional)
        </Label>
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
          <Sparkles className="mr-2 h-4 w-4" />
          {!canAfford ? "Not enough credits" : "Expand Image"}
        </Button>
      </div>

      {/* Cost */}
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

      {/* Tip */}
      <div className="rounded-xl bg-white/3 p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">How it works:</span>{" "}
          The AI analyzes your image and extends it naturally, maintaining
          style, lighting, and perspective. Perfect for converting square images
          to landscape format for social media or expanding cropped photos.
        </p>
      </div>
    </div>
  );
}
