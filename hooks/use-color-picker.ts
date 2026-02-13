"use client";

import { create } from "zustand";

// ── Color Types ──────────────────────────────────────────────────────────────

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface SampledColor {
  hex: string;
  rgb: RGBColor;
  hsl: HSLColor;
  timestamp: number;
  position?: { x: number; y: number };
}

// ── Color Conversion Utilities ───────────────────────────────────────────────

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => {
        const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case rN:
      h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
      break;
    case gN:
      h = ((bN - rN) / d + 2) / 6;
      break;
    case bN:
      h = ((rN - gN) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Compute relative luminance for contrast calculations.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Determine whether to use light or dark text on a given background color.
 */
export function contrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return relativeLuminance(r, g, b) > 128
    ? "rgba(0,0,0,0.8)"
    : "rgba(255,255,255,0.9)";
}

export function createSampledColor(
  r: number,
  g: number,
  b: number,
  position?: { x: number; y: number }
): SampledColor {
  return {
    hex: rgbToHex(r, g, b),
    rgb: { r: Math.round(r), g: Math.round(g), b: Math.round(b) },
    hsl: rgbToHsl(r, g, b),
    timestamp: Date.now(),
    position,
  };
}

// ── Image Processing ─────────────────────────────────────────────────────────

/**
 * Load an image URL into an offscreen canvas for pixel-level access.
 * Fetches as blob to safely handle cross-origin CDN images.
 */
export async function loadImageToCanvas(
  url: string
): Promise<HTMLCanvasElement> {
  const response = await fetch(url);
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

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas;
}

/**
 * Read the pixel color at (x, y) from a canvas.
 */
export function getPixelColor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): RGBColor {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { r: 0, g: 0, b: 0 };

  const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));

  const pixel = ctx.getImageData(px, py, 1, 1).data;
  return { r: pixel[0], g: pixel[1], b: pixel[2] };
}

// ── Median-Cut Color Quantization ────────────────────────────────────────────

interface ColorBox {
  colors: [number, number, number][];
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function createColorBox(colors: [number, number, number][]): ColorBox {
  let rMin = 255,
    rMax = 0;
  let gMin = 255,
    gMax = 0;
  let bMin = 255,
    bMax = 0;

  for (const [r, g, b] of colors) {
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }

  return { colors, rMin, rMax, gMin, gMax, bMin, bMax };
}

function medianCut(
  pixels: [number, number, number][],
  targetCount: number
): [number, number, number][] {
  if (pixels.length === 0) return [];
  if (pixels.length <= targetCount) return pixels;

  const boxes: ColorBox[] = [createColorBox(pixels)];

  while (boxes.length < targetCount) {
    // Find the box with the largest range that can be split
    let bestIdx = -1;
    let bestRange = 0;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.colors.length < 2) continue;

      const range = Math.max(
        box.rMax - box.rMin,
        box.gMax - box.gMin,
        box.bMax - box.bMin
      );

      if (range > bestRange) {
        bestRange = range;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const box = boxes[bestIdx];
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;

    // Split along the axis with the widest range
    let axis: 0 | 1 | 2;
    if (rRange >= gRange && rRange >= bRange) axis = 0;
    else if (gRange >= rRange && gRange >= bRange) axis = 1;
    else axis = 2;

    box.colors.sort((a, b) => a[axis] - b[axis]);

    const mid = Math.floor(box.colors.length / 2);
    boxes[bestIdx] = createColorBox(box.colors.slice(0, mid));
    boxes.push(createColorBox(box.colors.slice(mid)));
  }

  // Average the colors in each box
  return boxes.map((box) => {
    const n = box.colors.length;
    const sum = box.colors.reduce(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
      [0, 0, 0]
    );
    return [
      Math.round(sum[0] / n),
      Math.round(sum[1] / n),
      Math.round(sum[2] / n),
    ] as [number, number, number];
  });
}

/**
 * Extract dominant colors from an image using median-cut quantization.
 * Samples the image at reduced resolution for performance.
 */
export async function extractDominantColors(
  imageUrl: string,
  count: number = 8
): Promise<SampledColor[]> {
  const sourceCanvas = await loadImageToCanvas(imageUrl);

  // Down-sample for performance (max 150×150)
  const maxSample = 150;
  const scale = Math.min(
    1,
    maxSample / Math.max(sourceCanvas.width, sourceCanvas.height)
  );
  const sw = Math.max(1, Math.floor(sourceCanvas.width * scale));
  const sh = Math.max(1, Math.floor(sourceCanvas.height * scale));

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sw;
  sampleCanvas.height = sh;
  const sampleCtx = sampleCanvas.getContext("2d")!;
  sampleCtx.drawImage(sourceCanvas, 0, 0, sw, sh);

  const imageData = sampleCtx.getImageData(0, 0, sw, sh);
  const pixels: [number, number, number][] = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Skip near-white and near-black (typically backgrounds)
    const brightness = (r + g + b) / 3;
    if (brightness > 248 || brightness < 7) continue;

    pixels.push([r, g, b]);
  }

  if (pixels.length === 0) return [];

  const quantized = medianCut(pixels, count);

  // Sort by luminance for a pleasing gradient
  quantized.sort((a, b) => {
    const lA = relativeLuminance(a[0], a[1], a[2]);
    const lB = relativeLuminance(b[0], b[1], b[2]);
    return lA - lB;
  });

  return quantized.map(([r, g, b]) => createSampledColor(r, g, b));
}

// ── Magnifier Drawing ────────────────────────────────────────────────────────

/**
 * Draw a magnified, pixelated view of the area around (pixelX, pixelY)
 * onto the magnifier canvas with a circular clip and crosshair.
 */
export function drawMagnifier(
  magnifierCanvas: HTMLCanvasElement | null,
  sourceCanvas: HTMLCanvasElement | null,
  pixelX: number,
  pixelY: number
): void {
  if (!magnifierCanvas || !sourceCanvas) return;

  const ctx = magnifierCanvas.getContext("2d");
  if (!ctx) return;

  const size = 140;
  const gridSize = 15;
  const half = Math.floor(gridSize / 2);
  const cellSize = size / gridSize;

  // Dark fill for out-of-bounds regions
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, size, size);

  // Circular clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, size, size);

  // Draw magnified pixels (nearest-neighbour for pixelated look)
  ctx.imageSmoothingEnabled = false;

  const srcX = pixelX - half;
  const srcY = pixelY - half;

  // Clamp source rectangle to image bounds
  const clampedSrcX = Math.max(0, srcX);
  const clampedSrcY = Math.max(0, srcY);
  const clampedEndX = Math.min(sourceCanvas.width, srcX + gridSize);
  const clampedEndY = Math.min(sourceCanvas.height, srcY + gridSize);

  const srcW = clampedEndX - clampedSrcX;
  const srcH = clampedEndY - clampedSrcY;

  if (srcW > 0 && srcH > 0) {
    const dstX = (clampedSrcX - srcX) * cellSize;
    const dstY = (clampedSrcY - srcY) * cellSize;
    const dstW = srcW * cellSize;
    const dstH = srcH * cellSize;

    ctx.drawImage(
      sourceCanvas,
      clampedSrcX,
      clampedSrcY,
      srcW,
      srcH,
      dstX,
      dstY,
      dstW,
      dstH
    );
  }

  // Center pixel crosshair
  const cx = half * cellSize;
  const cy = half * cellSize;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, cy, cellSize, cellSize);

  ctx.restore();
}

// ── Export Functions ──────────────────────────────────────────────────────────

export function exportAsJSON(
  palette: SampledColor[],
  dominant: SampledColor[]
): string {
  return JSON.stringify(
    {
      palette: palette.map((c) => ({
        hex: c.hex,
        rgb: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
        hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`,
      })),
      dominantColors: dominant.map((c) => ({
        hex: c.hex,
        rgb: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
        hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`,
      })),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function exportAsCSS(
  palette: SampledColor[],
  dominant: SampledColor[]
): string {
  const lines = [
    "/* Color Palette — exported from Brandex Studio */",
    `:root {`,
  ];
  palette.forEach((c, i) => {
    lines.push(`  --palette-${i + 1}: ${c.hex};`);
  });
  if (dominant.length > 0) {
    lines.push("");
    dominant.forEach((c, i) => {
      lines.push(`  --dominant-${i + 1}: ${c.hex};`);
    });
  }
  lines.push("}");
  return lines.join("\n");
}

export function exportAsTailwind(
  palette: SampledColor[],
  dominant: SampledColor[]
): string {
  const colors: Record<string, string> = {};
  palette.forEach((c, i) => {
    colors[`palette-${i + 1}`] = c.hex;
  });
  dominant.forEach((c, i) => {
    colors[`dominant-${i + 1}`] = c.hex;
  });
  return `// Tailwind config — exported from Brandex Studio\nconst colors = ${JSON.stringify(colors, null, 2)};\n`;
}

/**
 * Generate and download a PNG image containing the full color palette
 * as visual swatches with hex / RGB labels.
 */
export function downloadPaletteImage(
  palette: SampledColor[],
  dominant: SampledColor[]
): void {
  const allColors = [
    ...palette.map((c) => ({ ...c, group: "Sampled" })),
    ...dominant.map((c) => ({ ...c, group: "Dominant" })),
  ];

  if (allColors.length === 0) return;

  const swatchSize = 80;
  const gap = 12;
  const padding = 32;
  const labelHeight = 36;
  const colsPerRow = Math.min(allColors.length, 8);
  const rows = Math.ceil(allColors.length / colsPerRow);

  const headerHeight = 64;
  const canvasWidth = padding * 2 + colsPerRow * (swatchSize + gap) - gap;
  const canvasHeight =
    padding * 2 + headerHeight + rows * (swatchSize + labelHeight + gap);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Color Palette", padding, padding + 24);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    `${allColors.length} colors · Brandex Studio · ${new Date().toLocaleDateString()}`,
    padding,
    padding + 46
  );

  // Swatches
  allColors.forEach((color, i) => {
    const col = i % colsPerRow;
    const row = Math.floor(i / colsPerRow);
    const x = padding + col * (swatchSize + gap);
    const y = padding + headerHeight + row * (swatchSize + labelHeight + gap);

    // Rounded swatch
    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.roundRect(x, y, swatchSize, swatchSize, 8);
    ctx.fill();

    // Hex label
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 11px monospace";
    ctx.fillText(color.hex, x, y + swatchSize + 16);

    // RGB label
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px monospace";
    ctx.fillText(
      `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`,
      x,
      y + swatchSize + 30
    );
  });

  // Download
  const link = document.createElement("a");
  link.download = `brandex-palette-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Zustand Store ────────────────────────────────────────────────────────────

interface ColorPickerState {
  palette: SampledColor[];
  activeIndex: number | null;
  dominantColors: SampledColor[];
  isExtracting: boolean;
  hoverColor: SampledColor | null;

  addColor: (color: SampledColor) => void;
  removeColor: (index: number) => void;
  setActiveIndex: (index: number | null) => void;
  setDominantColors: (colors: SampledColor[]) => void;
  setExtracting: (extracting: boolean) => void;
  setHoverColor: (color: SampledColor | null) => void;
  clearPalette: () => void;
  clearAll: () => void;
  addDominantToPalette: () => void;
}

export const useColorPickerStore = create<ColorPickerState>((set) => ({
  palette: [],
  activeIndex: null,
  dominantColors: [],
  isExtracting: false,
  hoverColor: null,

  addColor: (color) =>
    set((state) => ({
      palette: [...state.palette, color],
      activeIndex: state.palette.length,
    })),

  removeColor: (index) =>
    set((state) => {
      const newPalette = state.palette.filter((_, i) => i !== index);
      let newActive = state.activeIndex;
      if (newActive === index) {
        newActive =
          newPalette.length > 0
            ? Math.min(index, newPalette.length - 1)
            : null;
      } else if (newActive !== null && newActive > index) {
        newActive--;
      }
      return { palette: newPalette, activeIndex: newActive };
    }),

  setActiveIndex: (index) => set({ activeIndex: index }),
  setDominantColors: (colors) => set({ dominantColors: colors }),
  setExtracting: (extracting) => set({ isExtracting: extracting }),
  setHoverColor: (color) => set({ hoverColor: color }),
  clearPalette: () => set({ palette: [], activeIndex: null }),
  clearAll: () =>
    set({
      palette: [],
      activeIndex: null,
      dominantColors: [],
      hoverColor: null,
    }),

  addDominantToPalette: () =>
    set((state) => {
      const existingHexes = new Set(state.palette.map((c) => c.hex));
      const newColors = state.dominantColors.filter(
        (c) => !existingHexes.has(c.hex)
      );
      if (newColors.length === 0) return state;
      return {
        palette: [...state.palette, ...newColors],
        activeIndex: state.palette.length + newColors.length - 1,
      };
    }),
}));
