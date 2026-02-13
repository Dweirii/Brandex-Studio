"use client";

import { useRef, useCallback } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  Sun,
  Contrast,
  Palette,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import {
  useAdjustmentsStore,
  hasAdjustmentChanges,
  buildCSSFilter,
  applyAdjustmentsToImage,
  ADJUSTMENT_DEFAULTS,
} from "@/hooks/use-image-adjustments";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Reusable Slider ──────────────────────────────────────────────────────────

function AdjustmentSlider({
  label,
  icon: Icon,
  value,
  onChange,
  onReset,
  min = 0,
  max = 200,
  defaultValue = 100,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  onChange: (v: number) => void;
  onReset: () => void;
  min?: number;
  max?: number;
  defaultValue?: number;
}) {
  const isDefault = value === defaultValue;
  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-white/40" />
          <span className="text-xs font-medium text-white/60">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs tabular-nums min-w-[2.5rem] text-right transition-colors",
              isDefault ? "text-white/40" : "text-primary font-semibold"
            )}
          >
            {value}%
          </span>
          {!isDefault && (
            <button
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              onClick={onReset}
              title={`Reset ${label}`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="studio-slider"
          style={{
            background: `linear-gradient(to right, rgba(0,235,2,0.4) 0%, rgba(0,235,2,0.4) ${fillPercent}%, rgba(255,255,255,0.08) ${fillPercent}%, rgba(255,255,255,0.08) 100%)`,
          }}
        />

        {/* Default marker tick */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/20 pointer-events-none"
          style={{ left: `${((defaultValue - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function AdjustmentsPanel() {
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const images = useStudioStore((s) => s.images);
  const projectId = useStudioStore((s) => s.projectId);
  const addImage = useStudioStore((s) => s.addImage);
  const setProcessing = useStudioStore((s) => s.setProcessing);
  const isProcessing = useStudioStore((s) => s.isProcessing);

  const { studioUpload } = useStudioApi();
  const isSubmittingRef = useRef(false);

  const activeImage = images.find((img) => img.id === activeImageId);

  const brightness = useAdjustmentsStore((s) => s.brightness);
  const contrast = useAdjustmentsStore((s) => s.contrast);
  const saturation = useAdjustmentsStore((s) => s.saturation);

  const changed = hasAdjustmentChanges({ brightness, contrast, saturation });
  const cssFilter = buildCSSFilter({ brightness, contrast, saturation });

  // ── Apply: bake adjustments into a new image ─────────────────────────────

  const handleApply = useCallback(async () => {
    if (isSubmittingRef.current || !activeImage || !projectId || !changed) return;
    isSubmittingRef.current = true;

    setProcessing(true, "Applying adjustments...");

    try {
      // Render image with CSS filters on a canvas
      const adjustedBlob = await applyAdjustmentsToImage(
        activeImage.url,
        cssFilter
      );

      // Upload the adjusted image to the backend
      const formData = new FormData();
      formData.append("image", adjustedBlob, "adjusted.png");
      formData.append("projectId", projectId);

      const result = await studioUpload<{
        id: string;
        url: string;
        type: string;
        creditsCost: number;
        fileFormat?: string | null;
        fileSize?: number | null;
        width?: number | null;
        height?: number | null;
      }>("/upload", formData);

      addImage({
        id: result.id,
        type: result.type || "original",
        url: result.url,
        creditsCost: result.creditsCost || 0,
        createdAt: new Date().toISOString(),
        fileFormat: result.fileFormat,
        fileSize: result.fileSize,
        width: result.width,
        height: result.height,
      });

      // Reset sliders after successful apply
      useAdjustmentsStore.getState().reset();
      toast.success("Adjustments applied — new image created!");
    } catch (error) {
      handleError(error, { operation: "apply adjustments" });
    } finally {
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  }, [activeImage, projectId, changed, cssFilter, setProcessing, addImage, studioUpload]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Quick Adjustments
          </CardTitle>
          <CardDescription>
            Fine-tune brightness, contrast, and saturation with real-time
            non-destructive preview.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Sliders ──────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <AdjustmentSlider
          label="Brightness"
          icon={Sun}
          value={brightness}
          onChange={(v) => useAdjustmentsStore.getState().setBrightness(v)}
          onReset={() =>
            useAdjustmentsStore
              .getState()
              .setBrightness(ADJUSTMENT_DEFAULTS.brightness)
          }
        />

        <AdjustmentSlider
          label="Contrast"
          icon={Contrast}
          value={contrast}
          onChange={(v) => useAdjustmentsStore.getState().setContrast(v)}
          onReset={() =>
            useAdjustmentsStore
              .getState()
              .setContrast(ADJUSTMENT_DEFAULTS.contrast)
          }
        />

        <AdjustmentSlider
          label="Saturation"
          icon={Palette}
          value={saturation}
          onChange={(v) => useAdjustmentsStore.getState().setSaturation(v)}
          onReset={() =>
            useAdjustmentsStore
              .getState()
              .setSaturation(ADJUSTMENT_DEFAULTS.saturation)
          }
        />
      </div>

      {/* ── Preview indicator ────────────────────────────────────────────── */}
      {changed && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 animate-in fade-in duration-200">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-medium text-primary/80">
            Live preview active — original image unchanged
          </span>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <Button
          className="w-full"
          disabled={!changed || isProcessing || !activeImage}
          onClick={handleApply}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="mr-2 h-3.5 w-3.5" />
              Apply Adjustments
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!changed}
          onClick={() => useAdjustmentsStore.getState().reset()}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset All
        </Button>
      </div>

      {/* ── Cost indicator ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
        <span className="text-[11px] text-white/40">Cost</span>
        <span className="text-[11px] font-semibold text-primary/70">
          Free
        </span>
      </div>

      {/* ── Tip ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white/[0.03] p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">Tip:</span> Drag the
          sliders to preview changes in real time. Click the center tick mark to
          snap back to default. Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            A
          </kbd>{" "}
          to toggle adjustments.
        </p>
      </div>
    </div>
  );
}
