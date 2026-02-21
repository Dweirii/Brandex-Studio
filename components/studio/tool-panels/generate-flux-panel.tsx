"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "21:9", label: "21:9" },
] as const;

export function GenerateFluxPanel() {
  const { studioRequest } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, addImage, setProcessing, isProcessing } = useStudioStore();

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [raw, setRaw] = useState(false);
  const isSubmittingRef = useRef(false);

  const creditCost = 15;
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

    setProcessing(true, "Generating image with FLUX Ultra...", "generate_flux", prompt);

    try {
      const result = await studioRequest<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/generate-flux", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          projectId,
          aspectRatio,
          raw,
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
          <Wand2 className="h-4 w-4" />
          <h3 className="font-semibold">Generate Image</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Ultra-high quality AI generation with FLUX 1.1 Pro Ultra
        </p>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="flux-prompt">Prompt</Label>
        <Textarea
          id="flux-prompt"
          placeholder="A product on a marble countertop with soft studio lighting..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={2000}
          className="resize-none"
        />
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label>Aspect Ratio</Label>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                aspectRatio === ar.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setAspectRatio(ar.value)}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </div>

      {/* Raw Mode */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="flux-raw" className="text-xs font-medium cursor-pointer">
            Raw Mode
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Natural, less processed look — great for realism
          </p>
        </div>
        <Switch
          id="flux-raw"
          checked={raw}
          onCheckedChange={setRaw}
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
        <BuyCreditsPrompt needed={creditCost} balance={balance} />
      )}
    </div>
  );
}
