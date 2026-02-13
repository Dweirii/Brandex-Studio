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
 * White = area to edit, Black = area to keep.
 */
export async function exportMaskAsBlob(
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Blob> {
  // Create a clean B&W canvas
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext("2d")!;

  // Black background (keep area)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Draw the mask in white (edit area)
  // The mask canvas has colored brush strokes; we just need to detect non-transparent pixels
  const maskCtx = maskCanvas.getContext("2d")!;
  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const exportData = ctx.getImageData(0, 0, width, height);

  const scaleX = maskCanvas.width / width;
  const scaleY = maskCanvas.height / height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * maskCanvas.width + srcX) * 4;
      const alpha = maskData.data[srcIdx + 3];

      if (alpha > 10) {
        const dstIdx = (y * width + x) * 4;
        exportData.data[dstIdx] = 255;     // R
        exportData.data[dstIdx + 1] = 255; // G
        exportData.data[dstIdx + 2] = 255; // B
        exportData.data[dstIdx + 3] = 255; // A
      }
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
