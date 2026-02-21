"use client";

import { useState, useRef, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wand2, Coins, Sparkles, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COST = 15;

export function GeminiAiEditorPanel() {
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

  const [prompt, setPrompt] = useState("");
  const hasMask = useMaskPainterStore((s) => s.hasMask);

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  const handleClearMask = useCallback(() => {
    const maskCanvas = getMaskCanvas();
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    useMaskPainterStore.getState().setHasMask(false);
  }, []);

  const handleEdit = useCallback(async () => {
    if (isSubmittingRef.current || !activeImage || !projectId) return;
    isSubmittingRef.current = true;

    if (!prompt.trim()) {
      toast.error("Enter Edit Instructions", {
        description: "Describe what you want to change in the image.",
        duration: 5000,
      });
      isSubmittingRef.current = false;
      return;
    }

    // Capture mask BEFORE setProcessing (if user painted one)
    let maskBlob: Blob | null = null;
    if (hasMask) {
      const maskCanvas = getMaskCanvas();
      if (maskCanvas) {
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
      }
    }

    setProcessing(true, "Editing image with Gemini AI...", "gemini_ai_editor", prompt);

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
      formData.append("prompt", prompt.trim());
      
      if (maskBlob) {
        formData.append("mask", maskBlob, "mask.png");
      }

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/gemini-editor", formData);

      addImage({
        id: result.id,
        type: result.type || "edited",
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      handleClearMask();
      toast.success("Image edited successfully!");
      
      // Reset prompt
      setPrompt("");
    } catch (error) {
      handleError(error, { operation: "edit image with AI" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [
    activeImage,
    projectId,
    prompt,
    hasMask,
    setProcessing,
    studioUpload,
    addImage,
    setBalanceFromResponse,
    handleClearMask,
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4" />
            Gemini AI Editor
          </CardTitle>
          <CardDescription>
            Edit your image using natural language instructions. Powered by
            Gemini 3 Pro with fallback to 2.5 Flash.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Edit Instructions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="edit-prompt">Edit Instructions</Label>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  Describe what you want to change. Examples:<br />
                  • "Change the sky to sunset colors"<br />
                  • "Make the car red instead of blue"<br />
                  • "Add flowers in the background"<br />
                  • "Remove all text from the image"
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          id="edit-prompt"
          placeholder="E.g., 'Change the background to a beach sunset' or 'Make the shirt blue instead of red'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={2000}
          className="resize-none"
        />
        <p className="text-[10px] text-muted-foreground">
          Be specific about what you want to change. The more detail, the better the results.
        </p>
      </div>

      {/* Mask indicator (optional) */}
      {hasMask && (
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-primary/80">
              Target area selected — AI will focus edits here
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

      {/* Actions */}
      <div className="space-y-2.5">
        <Button
          className="w-full"
          size="lg"
          disabled={!activeImage || isProcessing || !canAfford || !prompt.trim()}
          onClick={handleEdit}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {!canAfford
            ? "Not enough credits"
            : !prompt.trim()
            ? "Enter instructions first"
            : "Edit with AI"}
        </Button>

        {hasMask && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleClearMask}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Clear Selection
          </Button>
        )}
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
        <BuyCreditsPrompt needed={COST} balance={balance} />
      )}

      {/* Tip */}
      <div className="rounded-xl bg-white/3 p-3 space-y-2">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">How it works:</span>{" "}
          Describe your changes in natural language, just like talking to a
          designer. The AI understands context and makes intelligent edits.
        </p>
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">Optional mask:</span>{" "}
          Paint over a specific area to focus the AI's attention. Leave blank
          to let the AI edit the entire image.
        </p>
      </div>

      {/* Examples */}
      <div className="rounded-xl bg-primary/5 p-3">
        <p className="text-[10px] font-semibold text-primary/70 mb-2">
          Example Instructions:
        </p>
        <ul className="space-y-1 text-[10px] text-white/40">
          <li>• "Change the sky to dramatic storm clouds"</li>
          <li>• "Make the walls white instead of blue"</li>
          <li>• "Add sunglasses to the person"</li>
          <li>• "Replace the laptop with a tablet"</li>
          <li>• "Change season from summer to winter"</li>
        </ul>
      </div>
    </div>
  );
}
