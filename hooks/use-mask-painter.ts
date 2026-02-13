/**
 * Mask Painter Store
 * Manages state for the brush-based mask painting overlay used by AI Edit.
 *
 * The user "paints" over the area they want to edit, creating a mask.
 * The mask is then sent alongside the image and prompt to the inpainting API.
 */

"use client";

import { create } from "zustand";

export type EditMode = "edit" | "remove";

interface MaskPainterState {
  /** Brush radius in pixels (relative to the mask canvas) */
  brushSize: number;
  /** Whether the user has painted anything */
  hasMask: boolean;
  /** The edit mode: "edit" = change/recolor, "remove" = erase object */
  editMode: EditMode;
  /** The user's edit prompt (e.g. "make it red", "change to leather jacket") */
  prompt: string;
  /** Direct reference to the mask <canvas> element (set by MaskCanvas on mount) */
  canvasElement: HTMLCanvasElement | null;

  setBrushSize: (size: number) => void;
  setHasMask: (has: boolean) => void;
  setEditMode: (mode: EditMode) => void;
  setPrompt: (prompt: string) => void;
  setCanvasElement: (el: HTMLCanvasElement | null) => void;
  reset: () => void;
}

export const useMaskPainterStore = create<MaskPainterState>((set) => ({
  brushSize: 30,
  hasMask: false,
  editMode: "edit",
  prompt: "",
  canvasElement: null,

  setBrushSize: (brushSize) => set({ brushSize }),
  setHasMask: (hasMask) => set({ hasMask }),
  setEditMode: (editMode) => set({ editMode }),
  setPrompt: (prompt) => set({ prompt }),
  setCanvasElement: (canvasElement) => set({ canvasElement }),
  reset: () =>
    set({
      brushSize: 30,
      hasMask: false,
      editMode: "edit",
      prompt: "",
      canvasElement: null,
    }),
}));

// ── DOM helper ──────────────────────────────────────────────────────────────

/**
 * Get the mask canvas element directly from the DOM.
 * This is the most reliable way to access it, avoiding React/Zustand timing issues.
 */
export function getMaskCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>("[data-mask-canvas]");
}

// ── Canvas helpers ──────────────────────────────────────────────────────────

/**
 * Draw a smooth brush stroke between two points on a 2D context.
 * Uses linear interpolation to fill gaps for fast mouse movements.
 */
export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number
) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(Math.ceil(dist / (radius * 0.3)), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Export a mask canvas as a black-and-white PNG blob.
 * White = area to edit/erase, Black = area to keep.
 *
 * Uses canvas `drawImage()` with bilinear interpolation for high-quality
 * scaling (instead of nearest-neighbor pixel copy). This produces smooth
 * mask edges that align precisely with the source image dimensions,
 * dramatically improving AI removal/edit quality on high-res images.
 */
export async function exportMaskAsBlob(
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Blob> {
  // ── Step 1: Convert painted strokes to a white-on-black mask ──────────
  // The mask canvas has COLORED brush strokes (e.g. green/red).
  // We need a clean white-on-black mask at the mask canvas's native resolution.
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = maskCanvas.width;
  tempCanvas.height = maskCanvas.height;
  const tempCtx = tempCanvas.getContext("2d")!;

  // Start with opaque black (keep area)
  tempCtx.fillStyle = "#000000";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Read painted pixels and write white wherever there's content
  const maskCtx = maskCanvas.getContext("2d")!;
  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

  for (let i = 0; i < maskData.data.length; i += 4) {
    if (maskData.data[i + 3] > 10) {
      tempData.data[i] = 255;       // R → white
      tempData.data[i + 1] = 255;   // G
      tempData.data[i + 2] = 255;   // B
      tempData.data[i + 3] = 255;   // A → opaque
    }
  }
  tempCtx.putImageData(tempData, 0, 0);

  // ── Step 2: Scale to image dimensions with smooth interpolation ────────
  // Canvas drawImage uses bilinear interpolation, producing smooth edges
  // instead of the blocky staircasing from nearest-neighbor pixel copy.
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tempCanvas, 0, 0, width, height);

  // ── Step 3: Threshold to clean B&W ────────────────────────────────────
  // Smooth scaling creates anti-aliased edges (gray pixels).
  // We threshold them to strict B&W. A lower threshold (64) includes
  // more of the transition zone, slightly expanding the mask at edges
  // which helps the AI produce cleaner removal results.
  const exportData = ctx.getImageData(0, 0, width, height);
  const data = exportData.data;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i]; // R channel (grayscale from B&W source)
    if (brightness > 64) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(exportData, 0, 0);

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export mask"))),
      "image/png"
    );
  });
}
