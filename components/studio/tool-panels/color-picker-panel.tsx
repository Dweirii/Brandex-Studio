"use client";

import { useCallback, useState } from "react";
import {
  Pipette,
  Copy,
  Check,
  Trash2,
  Download,
  FileJson,
  FileCode,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioStore } from "@/stores/use-studio-store";
import {
  useColorPickerStore,
  extractDominantColors,
  exportAsJSON,
  exportAsCSS,
  exportAsTailwind,
  downloadPaletteImage,
} from "@/hooks/use-color-picker";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ColorPickerPanel() {
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const images = useStudioStore((s) => s.images);
  const activeImage = images.find((img) => img.id === activeImageId);

  const palette = useColorPickerStore((s) => s.palette);
  const activeIndex = useColorPickerStore((s) => s.activeIndex);
  const dominantColors = useColorPickerStore((s) => s.dominantColors);
  const isExtracting = useColorPickerStore((s) => s.isExtracting);
  const hoverColor = useColorPickerStore((s) => s.hoverColor);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // The color to display: hover takes priority, then selected palette color
  const displayColor =
    hoverColor ?? (activeIndex !== null ? palette[activeIndex] : null);

  // ── Clipboard ────────────────────────────────────────────────────────────

  const handleCopy = useCallback(
    async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedField(null), 2000);
      } catch (error) {
        handleError(error, { operation: "copy to clipboard", silent: true });
      }
    },
    []
  );

  // ── Dominant Color Extraction ────────────────────────────────────────────

  const handleExtractColors = useCallback(async () => {
    if (!activeImage) return;

    useColorPickerStore.getState().setExtracting(true);
    try {
      const colors = await extractDominantColors(activeImage.url, 8);
      useColorPickerStore.getState().setDominantColors(colors);
      toast.success(`Extracted ${colors.length} dominant colors`);
    } catch (error) {
      handleError(error, { operation: "extract colors" });
    } finally {
      useColorPickerStore.getState().setExtracting(false);
    }
  }, [activeImage]);

  // ── Export Handlers ──────────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    const json = exportAsJSON(palette, dominantColors);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `brandex-palette-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Palette exported as JSON");
  }, [palette, dominantColors]);

  const handleExportCSS = useCallback(() => {
    const css = exportAsCSS(palette, dominantColors);
    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `brandex-palette-${Date.now()}.css`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Palette exported as CSS");
  }, [palette, dominantColors]);

  const handleExportTailwind = useCallback(() => {
    const tw = exportAsTailwind(palette, dominantColors);
    navigator.clipboard.writeText(tw);
    toast.success("Tailwind config copied to clipboard");
  }, [palette, dominantColors]);

  const handleExportImage = useCallback(() => {
    downloadPaletteImage(palette, dominantColors);
    toast.success("Palette image downloaded");
  }, [palette, dominantColors]);

  const hasColors = palette.length > 0 || dominantColors.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pipette className="h-4 w-4" />
            Color Picker
          </CardTitle>
          <CardDescription>
            Click anywhere on the image to sample colors and build your palette.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ── Active Color ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
          Active Color
        </div>

        {displayColor ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex gap-3">
              {/* Large swatch */}
              <div
                className="h-[72px] w-[72px] shrink-0 rounded-xl shadow-[0_0_12px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-colors duration-150"
                style={{ backgroundColor: displayColor.hex }}
              />

              {/* Color values — each clickable to copy */}
              <div className="flex flex-col justify-center gap-1.5 min-w-0 flex-1">
                {/* HEX */}
                <button
                  className="group flex items-center gap-2 text-left rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-white/[0.04] transition-colors"
                  onClick={() => handleCopy(displayColor.hex, "hex")}
                >
                  <span className="font-mono text-sm font-semibold text-white/90 truncate">
                    {displayColor.hex}
                  </span>
                  {copiedField === "hex" ? (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <Copy className="h-3 w-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>

                {/* RGB */}
                <button
                  className="group flex items-center gap-2 text-left rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-white/[0.04] transition-colors"
                  onClick={() =>
                    handleCopy(
                      `rgb(${displayColor.rgb.r}, ${displayColor.rgb.g}, ${displayColor.rgb.b})`,
                      "rgb"
                    )
                  }
                >
                  <span className="font-mono text-xs text-white/50 truncate">
                    {displayColor.rgb.r}, {displayColor.rgb.g},{" "}
                    {displayColor.rgb.b}
                  </span>
                  {copiedField === "rgb" ? (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <Copy className="h-3 w-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>

                {/* HSL */}
                <button
                  className="group flex items-center gap-2 text-left rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-white/[0.04] transition-colors"
                  onClick={() =>
                    handleCopy(
                      `hsl(${displayColor.hsl.h}, ${displayColor.hsl.s}%, ${displayColor.hsl.l}%)`,
                      "hsl"
                    )
                  }
                >
                  <span className="font-mono text-xs text-white/50 truncate">
                    {displayColor.hsl.h}° {displayColor.hsl.s}%{" "}
                    {displayColor.hsl.l}%
                  </span>
                  {copiedField === "hsl" ? (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  ) : (
                    <Copy className="h-3 w-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[72px] items-center justify-center rounded-xl bg-white/[0.03] border border-dashed border-white/10">
            <p className="text-xs text-white/30">
              {activeImage
                ? "Hover over the image to preview"
                : "Select an image first"}
            </p>
          </div>
        )}
      </div>

      {/* ── Sampled Palette ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
            Palette ({palette.length})
          </div>
          {palette.length > 0 && (
            <button
              className="text-[10px] font-medium text-white/30 hover:text-white/60 transition-colors"
              onClick={() => useColorPickerStore.getState().clearPalette()}
            >
              Clear
            </button>
          )}
        </div>

        {palette.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {palette.map((color, index) => (
              <div key={`${color.hex}-${color.timestamp}`} className="group relative">
                <button
                  className={cn(
                    "h-11 w-full rounded-lg shadow-sm transition-all duration-200 ring-1",
                    activeIndex === index
                      ? "ring-primary scale-110 shadow-[0_0_8px_0_rgba(0,235,2,0.3)] z-10"
                      : "ring-white/10 hover:ring-white/30 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.hex }}
                  onClick={() =>
                    useColorPickerStore.getState().setActiveIndex(index)
                  }
                  title={color.hex}
                />
                <button
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-md transition-all hover:bg-red-500 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    useColorPickerStore.getState().removeColor(index);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-11 items-center justify-center rounded-xl bg-white/[0.03] border border-dashed border-white/10">
            <p className="text-[11px] text-white/30">
              No colors sampled yet
            </p>
          </div>
        )}
      </div>

      {/* ── Dominant Colors ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
          Dominant Colors
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleExtractColors}
          disabled={!activeImage || isExtracting}
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Analyzing image...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Extract from Image
            </>
          )}
        </Button>

        {dominantColors.length > 0 && (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-8 gap-1.5">
              {dominantColors.map((color, index) => (
                <button
                  key={`dominant-${color.hex}-${index}`}
                  className="h-8 w-full rounded-md shadow-sm ring-1 ring-white/10 transition-all hover:scale-110 hover:ring-white/30 hover:shadow-md"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => {
                    const exists = palette.some((c) => c.hex === color.hex);
                    if (!exists) {
                      useColorPickerStore.getState().addColor(color);
                      toast.success(`Added ${color.hex} to palette`);
                    } else {
                      toast.info("Color already in palette");
                    }
                  }}
                  title={`${color.hex} — Click to add`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-white/50 hover:text-white"
              onClick={() => {
                useColorPickerStore.getState().addDominantToPalette();
                toast.success("Added dominant colors to palette");
              }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add All to Palette
            </Button>
          </div>
        )}
      </div>

      {/* ── Export ───────────────────────────────────────────────────────── */}
      {hasColors && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
            Export Palette
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleExportJSON}
            >
              <FileJson className="mr-1.5 h-3.5 w-3.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleExportCSS}
            >
              <FileCode className="mr-1.5 h-3.5 w-3.5" />
              CSS
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleExportTailwind}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Tailwind
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={handleExportImage}
            >
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
              PNG
            </Button>
          </div>

          {/* Full report download */}
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => {
              // Combined report: JSON + PNG
              handleExportJSON();
              downloadPaletteImage(palette, dominantColors);
              toast.success("Full palette report downloaded");
            }}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Download Full Report
          </Button>
        </div>
      )}

      {/* ── Hint ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white/[0.03] p-3">
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="font-semibold text-white/50">Tip:</span> Click
          anywhere on the image to sample a color. Use the magnifier for
          pixel-precise selection. Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white/50">
            P
          </kbd>{" "}
          to toggle the picker.
        </p>
      </div>
    </div>
  );
}
