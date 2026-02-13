/**
 * Export Presets Hook
 * Manages export presets and image export operations.
 * Uses blob download for cross-origin CDN URLs.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useStudioApi } from "./use-studio-api";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";

export interface ExportPreset {
  id: string;
  name: string;
  width: number | null;
  height: number | null;
  format: string;
  quality: number | null;
  isBuiltIn: boolean;
  isDefault: boolean;
  createdAt?: string;
}

export function useExportPresets() {
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { studioRequest } = useStudioApi();

  // Fetch presets on mount
  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await studioRequest<ExportPreset[]>("/export-presets");
      setPresets(data);
    } catch (error) {
      handleError(error, { operation: "load export presets" });
    } finally {
      setIsLoading(false);
    }
  }, [studioRequest]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Create custom preset
  const createPreset = useCallback(
    async (preset: Omit<ExportPreset, "id" | "isBuiltIn" | "createdAt">) => {
      try {
        const newPreset = await studioRequest<ExportPreset>("/export-presets", {
          method: "POST",
          body: JSON.stringify(preset),
        });
        setPresets((prev) => [...prev, newPreset]);
        toast.success("Preset created");
        return newPreset;
      } catch (error) {
        handleError(error, { operation: "create preset" });
        throw error;
      }
    },
    [studioRequest]
  );

  // Delete custom preset
  const deletePreset = useCallback(
    async (presetId: string) => {
      if (!presetId) return;
      try {
        await studioRequest(`/export-presets/${presetId}`, {
          method: "DELETE",
        });
        setPresets((prev) => prev.filter((p) => p.id !== presetId));
        toast.success("Preset deleted");
      } catch (error) {
        handleError(error, { operation: "delete preset" });
        throw error;
      }
    },
    [studioRequest]
  );

  // Export image with preset — uses blob download for cross-origin URLs
  // Optional `customFilename` lets the caller provide a user-entered name.
  const exportImage = useCallback(
    async (
      imageId: string,
      presetId: string,
      saveToProject: boolean = false,
      customFilename?: string
    ) => {
      if (!imageId || !presetId) return;
      setIsExporting(true);
      try {
        const result = await studioRequest<{
          url: string;
          format: string;
          width?: number;
          height?: number;
          size: number;
          processingTime: number;
        }>(`/images/${imageId}/export`, {
          method: "POST",
          body: JSON.stringify({ presetId, saveToProject }),
        });

        // Build filename: user-entered > auto-generated default
        const filename = customFilename
          ? `${customFilename}.${result.format}`
          : `brandex-export-${Date.now()}.${result.format}`;

        // Fetch as blob for cross-origin download support
        try {
          const response = await fetch(result.url);
          if (!response.ok) throw new Error("Fetch failed");
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Fallback: open in new tab if blob download fails
          window.open(result.url, "_blank");
        }

        toast.success(
          `Exported in ${(result.processingTime / 1000).toFixed(2)}s (${(
            result.size /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );

        return result;
      } catch (error) {
        handleError(error, { operation: "export image" });
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    [studioRequest]
  );

  return {
    presets,
    isLoading,
    isExporting,
    fetchPresets,
    createPreset,
    deletePreset,
    exportImage,
  };
}
