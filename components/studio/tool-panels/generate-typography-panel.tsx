"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Type, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GenerateTypographyPanel() {
  const { studioRequest } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, addImage, setProcessing, isProcessing } = useStudioStore();

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [styleType, setStyleType] = useState("design");
  const isSubmittingRef = useRef(false);

  const creditCost = 10;
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

    setProcessing(true, "Generating typography with Ideogram...", "generate_typography", prompt);

    try {
      const result = await studioRequest<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/generate-typography", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          projectId,
          aspectRatio,
          styleType,
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
      toast.success("Typography generated successfully!");
      setPrompt("");
    } catch (error) {
      handleError(error, { operation: "generate typography" });
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
          <Type className="h-4 w-4" />
          <h3 className="font-semibold">Typography & Logos</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate images with perfect text and typography
        </p>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="typo-prompt">Prompt</Label>
        <Textarea
          id="typo-prompt"
          placeholder='A logo with the text "BRANDEX" in bold modern sans-serif, minimal gradient...'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={2000}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be specific about the text you want to appear
        </p>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="typo-aspect">Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger id="typo-aspect">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">Square (1:1)</SelectItem>
            <SelectItem value="16:9">Landscape (16:9)</SelectItem>
            <SelectItem value="9:16">Portrait (9:16)</SelectItem>
            <SelectItem value="4:3">Standard (4:3)</SelectItem>
            <SelectItem value="3:4">Tall (3:4)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Style Type */}
      <div className="space-y-2">
        <Label htmlFor="typo-style">Style</Label>
        <Select value={styleType} onValueChange={setStyleType}>
          <SelectTrigger id="typo-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="design">Design / Logo</SelectItem>
            <SelectItem value="auto">Auto (AI chooses)</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="realistic">Realistic</SelectItem>
            <SelectItem value="3d">3D Render</SelectItem>
            <SelectItem value="anime">Anime / Illustration</SelectItem>
          </SelectContent>
        </Select>
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
