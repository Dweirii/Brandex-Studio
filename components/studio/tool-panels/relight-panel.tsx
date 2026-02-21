"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sun, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RelightPanel() {
  const { studioUpload } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, activeImageId, images, addImage, setProcessing, isProcessing } = useStudioStore();

  const [prompt, setPrompt] = useState("");
  const [direction, setDirection] = useState<string>("front");
  const [intensity, setIntensity] = useState(5);
  const [temperature, setTemperature] = useState<string>("neutral");
  const isSubmittingRef = useRef(false);

  const creditCost = 15;
  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= creditCost;

  const handleRelight = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!prompt.trim()) {
      toast.error("Please describe the lighting you want");
      isSubmittingRef.current = false;
      return;
    }

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

    setProcessing(true, "Relighting image with AI...");

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
      formData.append("prompt", prompt);
      formData.append("direction", direction);
      formData.append("intensity", intensity.toString());
      formData.append("temperature", temperature);
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/relight", formData);

      addImage({
        parentId: activeImage.id,
        id: result.id,
        type: result.type,
        url: result.url,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Image relit successfully!");
      setPrompt("");
    } catch (error) {
      handleError(error, { operation: "relight image" });
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
          <Sun className="h-4 w-4" />
          <h3 className="font-semibold">Relight Image</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          AI-powered lighting control for professional results
        </p>
      </div>

      {/* Lighting Prompt */}
      <div className="space-y-2">
        <Label htmlFor="relight-prompt">Lighting Description</Label>
        <Textarea
          id="relight-prompt"
          placeholder="Soft studio lighting, golden hour glow, dramatic side lighting..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={2000}
          className="resize-none"
        />
      </div>

      {/* Direction */}
      <div className="space-y-2">
        <Label htmlFor="relight-direction">Light Direction</Label>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger id="relight-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <Label htmlFor="relight-temp">Color Temperature</Label>
        <Select value={temperature} onValueChange={setTemperature}>
          <SelectTrigger id="relight-temp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warm">Warm (Golden)</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="cool">Cool (Blue)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Intensity Slider */}
      <div className="space-y-2">
        <Label htmlFor="relight-intensity">
          Intensity: {intensity}
        </Label>
        <Input
          id="relight-intensity"
          type="range"
          min={0}
          max={10}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value) || 5)}
          className="h-2"
        />
      </div>

      {/* Relight Button */}
      <Button
        onClick={handleRelight}
        disabled={isProcessing || !activeImage || !prompt.trim() || !canAfford}
        className="w-full"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {!canAfford ? "Not enough credits" : `Relight (${creditCost} credits)`}
      </Button>

      {!canAfford && (
        <BuyCreditsPrompt needed={creditCost} balance={balance} />
      )}
    </div>
  );
}
