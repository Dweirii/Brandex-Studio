"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrainCircuit, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GenerateGeminiPanel() {
  const { studioRequest } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, addImage, setProcessing, isProcessing } = useStudioStore();

  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [negativePrompt, setNegativePrompt] = useState("");
  const isSubmittingRef = useRef(false);

  const creditCost = quality === "hd" ? 60 : 10;
  const canAfford = balance >= creditCost;

  const handleGenerate = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      isSubmittingRef.current = false;
      return;
    }

    if (!projectId) {
      toast.error("No project selected");
      isSubmittingRef.current = false;
      return;
    }

    setProcessing(true, "Generating image with Gemini...", "generate_gemini", prompt);

    try {
      const result = await studioRequest<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/generate-gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          projectId,
          quality,
          aspectRatio,
          negativePrompt: negativePrompt || undefined,
        }),
      });

      addImage({
        id: result.id,
        type: result.type,
        url: result.url,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Image generated successfully!");
      setPrompt("");
    } catch (error) {
      handleError(error, { operation: "generate image" });
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
          <BrainCircuit className="h-4 w-4" />
          <h3 className="font-semibold">Gemini Generate</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Google Gemini AI — high-quality image generation with reference support
        </p>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="gemini-prompt">Prompt</Label>
        <Textarea
          id="gemini-prompt"
          placeholder="A sleek product on a modern desk with natural sunlight..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={2000}
          className="resize-none"
        />
      </div>

      {/* Quality Selection */}
      <div className="space-y-3">
        <Label>Quality</Label>
        <RadioGroup value={quality} onValueChange={(v) => setQuality(v as "standard" | "hd")}>
          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem value="standard" id="quality-standard" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="quality-standard" className="cursor-pointer font-medium">
                Standard
              </Label>
              <p className="text-xs text-muted-foreground">
                Fast, great quality (10 credits)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border bg-card p-3">
            <RadioGroupItem value="hd" id="quality-hd" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="quality-hd" className="cursor-pointer font-medium">
                HD (4K)
              </Label>
              <p className="text-xs text-muted-foreground">
                Ultra detailed, professional quality (60 credits)
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="gemini-aspect">Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger id="gemini-aspect">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 Square</SelectItem>
            <SelectItem value="16:9">16:9 Landscape</SelectItem>
            <SelectItem value="9:16">9:16 Portrait</SelectItem>
            <SelectItem value="4:3">4:3 Standard</SelectItem>
            <SelectItem value="3:4">3:4 Tall</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Negative Prompt */}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <Label htmlFor="gemini-negative" className="text-xs font-medium text-muted-foreground">
          Negative Prompt (optional)
        </Label>
        <Textarea
          id="gemini-negative"
          placeholder="blurry, low quality, distorted, watermark..."
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          rows={2}
          maxLength={2000}
          className="resize-none"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isProcessing || !prompt.trim() || !canAfford}
        className="w-full"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {!canAfford ? "Not enough credits" : `Generate (${creditCost} credits)`}
      </Button>

      {!canAfford && (
        <p className="text-center text-xs text-destructive">
          You need {creditCost} credits. Current balance: {balance}
        </p>
      )}
    </div>
  );
}
