"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdjustmentValues {
  brightness: number; // 0-200  (100 = no change)
  contrast: number; // 0-200  (100 = no change)
  saturation: number; // 0-200  (100 = no change)
}

const DEFAULTS: AdjustmentValues = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

// ── Store ────────────────────────────────────────────────────────────────────

interface AdjustmentsState extends AdjustmentValues {
  /** Which image these adjustments target (reset on image switch). */
  targetImageId: string | null;

  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  setSaturation: (v: number) => void;
  setTargetImageId: (id: string | null) => void;
  reset: () => void;
}

export const useAdjustmentsStore = create<AdjustmentsState>((set) => ({
  ...DEFAULTS,
  targetImageId: null,

  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),

  setTargetImageId: (id) =>
    set({ targetImageId: id, ...DEFAULTS }),

  reset: () => set({ ...DEFAULTS }),
}));

// ── Selectors / helpers ──────────────────────────────────────────────────────

/** True when at least one slider deviates from the default. */
export function hasAdjustmentChanges(state: AdjustmentValues): boolean {
  return (
    state.brightness !== DEFAULTS.brightness ||
    state.contrast !== DEFAULTS.contrast ||
    state.saturation !== DEFAULTS.saturation
  );
}

/**
 * Build a CSS `filter` string from the current adjustment values.
 * Returns `"none"` when every value is at the default.
 */
export function buildCSSFilter(state: AdjustmentValues): string {
  if (!hasAdjustmentChanges(state)) return "none";

  const parts: string[] = [];
  if (state.brightness !== 100) parts.push(`brightness(${state.brightness / 100})`);
  if (state.contrast !== 100) parts.push(`contrast(${state.contrast / 100})`);
  if (state.saturation !== 100) parts.push(`saturate(${state.saturation / 100})`);

  return parts.join(" ") || "none";
}

/** The default values for each slider (exported so UI can reference them). */
export const ADJUSTMENT_DEFAULTS = DEFAULTS;

// ── Apply (bake filters into a new image) ────────────────────────────────────

/**
 * Render the image with the given CSS filter string onto a canvas
 * and return the result as a PNG Blob.
 *
 * Fetches the image as a blob first to handle cross-origin CDN URLs.
 */
export async function applyAdjustmentsToImage(
  imageUrl: string,
  cssFilter: string
): Promise<Blob> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Failed to get 2D context");
  }

  ctx.filter = cssFilter;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Canvas export failed"))),
      "image/png"
    );
  });
}
