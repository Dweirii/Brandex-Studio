/**
 * Image Filters Hook
 * Provides filtering and searching for images
 */

"use client";

import { useMemo } from "react";
import type { StudioImage } from "@/stores/use-studio-store";

export type FilterType = "all" | "favorites" | "original" | "edited" | "generated";
export type SortBy = "newest" | "oldest" | "credits_high" | "credits_low";

export interface ImageFilters {
  search: string;
  type: FilterType;
  sortBy: SortBy;
  minCredits?: number;
  maxCredits?: number;
}

export function useImageFilters(
  images: StudioImage[],
  filters: ImageFilters
) {
  const filteredImages = useMemo(() => {
    let result = [...images];

    // Filter by favorites
    if (filters.type === "favorites") {
      result = result.filter((img) => img.isFavorite);
    }

    // Filter by type
    else if (filters.type === "original") {
      result = result.filter((img) => img.type === "original");
    } else if (filters.type === "edited") {
      result = result.filter((img) =>
        ["bg_removed", "ai_background", "upscaled", "relit", "skin_enhanced"].includes(img.type)
      );
    } else if (filters.type === "generated") {
      result = result.filter((img) =>
        ["generated", "typography"].includes(img.type)
      );
    }

    // Search by prompt or type
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (img) =>
          img.type.toLowerCase().includes(searchLower) ||
          img.prompt?.toLowerCase().includes(searchLower) ||
          img.operation?.toLowerCase().includes(searchLower) ||
          img.provider?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by credits range
    if (filters.minCredits !== undefined) {
      result = result.filter((img) => img.creditsCost >= filters.minCredits!);
    }
    if (filters.maxCredits !== undefined) {
      result = result.filter((img) => img.creditsCost <= filters.maxCredits!);
    }

    // Sort
    switch (filters.sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "credits_high":
        result.sort((a, b) => b.creditsCost - a.creditsCost);
        break;
      case "credits_low":
        result.sort((a, b) => a.creditsCost - b.creditsCost);
        break;
    }

    return result;
  }, [images, filters]);

  return {
    filteredImages,
    totalCount: images.length,
    filteredCount: filteredImages.length,
  };
}
