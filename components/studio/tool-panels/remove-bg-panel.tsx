"use client";

import { useRef } from "react";
import { Eraser, Coins } from "lucide-react";
import { BuyCreditsPrompt } from "@/components/studio/buy-credits-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";

const COST = 5;

export function RemoveBgPanel() {
  const { studioUpload } = useStudioApi();
  const { balance, setBalanceFromResponse } = useCredits();
  const { projectId, activeImageId, images, isProcessing, setProcessing, addImage } =
    useStudioStore();
  const isSubmittingRef = useRef(false);

  const activeImage = images.find((img) => img.id === activeImageId);
  const canAfford = balance >= COST;

  const handleRemoveBg = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!activeImage || !projectId) {
      toast.error("Please select an image first");
      isSubmittingRef.current = false;
      return;
    }

    setProcessing(true, "Removing background...");

    try {
      // Fetch the active image as a blob
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
      formData.append("parentId", activeImage.id);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        newBalance: number;
      }>("/remove-bg", formData);

      addImage({
        id: result.id,
        type: result.type,
        url: result.url,
        parentId: activeImage.id,
        creditsCost: result.creditsCost,
        createdAt: new Date().toISOString(),
      });

      setBalanceFromResponse(result.newBalance);
      toast.success("Background removed successfully!");
    } catch (error) {
      handleError(error, { operation: "remove background" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eraser className="h-4 w-4" />
          Remove Background
        </CardTitle>
        <CardDescription>
          Remove the background from your product image. Creates a transparent
          PNG.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Cost</span>
            <span className="flex items-center gap-1 font-medium">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              {COST} credits
            </span>
          </div>

          <Button
            className="w-full"
            disabled={!activeImage || isProcessing || !canAfford}
            onClick={handleRemoveBg}
          >
            {!canAfford ? "Not enough credits" : "Remove Background"}
          </Button>

          {!canAfford && (
            <BuyCreditsPrompt needed={COST} balance={balance} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
