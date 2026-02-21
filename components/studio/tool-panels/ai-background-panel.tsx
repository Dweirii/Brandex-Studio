"use client";

import { useState, useRef } from "react";
import { ImagePlus, Coins } from "lucide-react";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";

const COST = 25;

const PROMPT_SUGGESTIONS = [
  "Product on white marble countertop, soft studio lighting",
  "Floating product on gradient background, professional photography",
  "Product on wooden shelf, warm natural lighting, lifestyle setting",
  "Clean white studio background with soft shadows",
  "Product on dark surface, dramatic side lighting, premium feel",
  "Outdoor setting, natural sunlight, green leaves in background",
];

export function AiBackgroundPanel() {
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

  const [prompt, setPrompt] = useState("");
  const [shadow, setShadow] = useState<"soft" | "hard" | "floating" | "none">(
    "soft"
  );
  const isSubmittingRef = useRef(false);

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  const handleGenerate = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!activeImage || !projectId || !prompt.trim()) {
      isSubmittingRef.current = false;
      return;
    }

    setProcessing(true, "Generating AI background...");

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
      formData.append("prompt", prompt.trim());
      formData.append("shadow", shadow);
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        prompt: string;
        creditsCost: number;
        newBalance: number;
      }>("/ai-background", formData);

      addImage({
        id: result.id,
        type: result.type,
        url: result.url,
        prompt: result.prompt,
        provider: "photoroom",
        operation: "ai_background",
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("AI background generated!");
    } catch (error) {
      handleError(error, { operation: "generate background" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ImagePlus className="h-4 w-4" />
          AI Background
        </CardTitle>
        <CardDescription>
          Generate a professional scene behind your product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Prompt */}
          <Textarea
            placeholder="Describe the background scene..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={2000}
            className="resize-none text-sm"
          />

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion.length > 40
                  ? suggestion.slice(0, 40) + "..."
                  : suggestion}
              </button>
            ))}
          </div>

          {/* Shadow control */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Shadow
            </label>
            <div className="flex gap-1.5">
              {(["soft", "hard", "floating", "none"] as const).map((opt) => (
                <button
                  key={opt}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                    shadow === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setShadow(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Cost + Generate */}
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Cost</span>
            <span className="flex items-center gap-1 font-medium">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              {COST} credits
            </span>
          </div>

          <Button
            className="w-full"
            disabled={
              !activeImage ||
              isProcessing ||
              !canAfford ||
              !prompt.trim()
            }
            onClick={handleGenerate}
          >
            {!canAfford ? "Not enough credits" : "Generate Background"}
          </Button>

          {!canAfford && (
            <BuyCreditsPrompt needed={COST} balance={balance} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
