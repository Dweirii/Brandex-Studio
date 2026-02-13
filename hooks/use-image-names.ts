/**
 * Image Naming Utilities
 *
 * Auto-generates descriptive names based on image type / metadata and
 * provides helpers for building download-safe filenames.
 */

import type { StudioImage } from "@/stores/use-studio-store";

// ── Type → human-readable label ──────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  original: "Upload",
  bg_removed: "BG Removed",
  ai_background: "AI Background",
  generated: "Generated",
  typography: "Typography",
  upscaled: "Upscaled",
  relit: "Relit",
  skin_enhanced: "Skin Enhanced",
};

// ── Auto-name generation ─────────────────────────────────────────────────────

/**
 * Build a descriptive display name for an image.
 *
 * Priority:
 *  1. User-assigned `image.name` (if not null / empty)
 *  2. Auto-generated from type + prompt snippet + short ID
 */
export function getImageDisplayName(image: StudioImage): string {
  if (image.name) return image.name;
  return generateAutoName(image);
}

/**
 * Generate a name from image metadata (never returns empty string).
 */
export function generateAutoName(image: StudioImage): string {
  const label = TYPE_LABELS[image.type] || image.type;
  const shortId = image.id.slice(0, 6);

  // For prompt-based images, include a snippet
  if (image.prompt) {
    const snippet = image.prompt
      .replace(/[^\w\s-]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
    if (snippet) return `${label} — ${snippet}`;
  }

  return `${label}_${shortId}`;
}

// ── Filename helpers ─────────────────────────────────────────────────────────

/**
 * Sanitize a display name into a safe filename.
 * Replaces illegal characters with underscores and trims whitespace.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .trim()
    || "brandex-image";
}

/**
 * Build a complete download filename with extension.
 *
 * @param image - The studio image
 * @param customName - Optional user-entered name (takes priority)
 * @param format - File extension without dot (defaults to "png")
 */
export function buildDownloadFilename(
  image: StudioImage,
  customName?: string | null,
  format: string = "png"
): string {
  const baseName = customName?.trim()
    ? sanitizeFilename(customName)
    : sanitizeFilename(getImageDisplayName(image));
  return `${baseName}.${format}`;
}

/**
 * Build a default filename for quick (skip) downloads.
 */
export function buildDefaultFilename(
  image: StudioImage,
  format: string = "png"
): string {
  const label = TYPE_LABELS[image.type] || "image";
  const shortId = image.id.slice(0, 8);
  return `brandex-${sanitizeFilename(label)}-${shortId}.${format}`;
}
