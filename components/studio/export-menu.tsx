/**
 * Export Menu Component
 * Dropdown menu for exporting images with presets.
 * Supports keyboard navigation (Escape to close).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, ChevronDown, Loader2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExportPresets } from "@/hooks/use-export-presets";
import { useStudioStore } from "@/stores/use-studio-store";
import { handleError } from "@/lib/error-handler";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DownloadDialog } from "./download-dialog";
import { getImageDisplayName, sanitizeFilename } from "@/hooks/use-image-names";

interface ExportMenuProps {
  imageId: string;
  className?: string;
}

export function ExportMenu({ imageId, className }: ExportMenuProps) {
  const { presets, isLoading, isExporting, exportImage } = useExportPresets();
  const images = useStudioStore((s) => s.images);
  const [isOpen, setIsOpen] = useState(false);

  // Download dialog state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);

  const activeImage = images.find((img) => img.id === imageId);
  const imageName = activeImage ? getImageDisplayName(activeImage) : "export";

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Step 1: user picks a preset → show the name dialog
  const handleExport = useCallback((presetId: string) => {
    setIsOpen(false);
    setPendingPresetId(presetId);
    setShowNameDialog(true);
  }, []);

  // Step 2a: user enters a custom name → export with that name
  const handleNamedExport = useCallback(
    async (filename: string) => {
      if (!pendingPresetId) return;
      try {
        await exportImage(imageId, pendingPresetId, false, sanitizeFilename(filename));
      } catch (error) {
        handleError(error, { operation: "export image" });
      }
      setPendingPresetId(null);
    },
    [exportImage, imageId, pendingPresetId]
  );

  // Step 2b: user clicks Skip → export with default name
  const handleSkipExport = useCallback(async () => {
    if (!pendingPresetId) return;
    try {
      await exportImage(imageId, pendingPresetId, false);
    } catch (error) {
      handleError(error, { operation: "export image" });
    }
    setPendingPresetId(null);
  }, [exportImage, imageId, pendingPresetId]);

  const builtInPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative">
        <Button
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || isExporting}
          className={cn(
            "relative gap-2 bg-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.15] transition-all duration-300 h-9 rounded-xl hover:scale-105 hover:shadow-[0_0_8px_0_rgba(255,255,255,0.2)]",
            className
          )}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-semibold">
            {isExporting ? "Exporting..." : "Export"}
          </span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        </Button>

        {/* Dropdown Menu */}
        {isOpen && !isExporting && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-[#141517] shadow-[0_0_20px_0_rgba(0,0,0,0.8)] py-2 z-50 animate-in slide-in-from-bottom-2 duration-200">
              {/* Built-in Presets */}
              {builtInPresets.length > 0 && (
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Quick Export
                    </span>
                  </div>
                  <div className="space-y-1">
                    {builtInPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleExport(preset.id)}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.05] group"
                      >
                        <span className="text-xs font-medium text-white/70 group-hover:text-white">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {preset.width && preset.height
                            ? `${preset.width}x${preset.height}`
                            : preset.format.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Presets */}
              {customPresets.length > 0 && (
                <>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-3 w-3 text-white/40" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Custom Presets
                      </span>
                    </div>
                    <div className="space-y-1">
                      {customPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleExport(preset.id)}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all hover:bg-white/[0.05] group"
                        >
                          <span className="text-xs font-medium text-white/70 group-hover:text-white">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">
                            {preset.width && preset.height
                              ? `${preset.width}x${preset.height}`
                              : preset.format.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              )}

              {/* Empty state */}
              {!isLoading && builtInPresets.length === 0 && customPresets.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-white/40">No export presets available</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Name-before-download dialog */}
      <DownloadDialog
        open={showNameDialog}
        onOpenChange={setShowNameDialog}
        defaultName={imageName}
        format={
          presets.find((p) => p.id === pendingPresetId)?.format || "png"
        }
        onDownload={handleNamedExport}
        onSkip={handleSkipExport}
      />
    </TooltipProvider>
  );
}
