"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useStudioStore, type StudioImage } from "@/stores/use-studio-store";
import { cn } from "@/lib/utils";
import { Download, Coins, X, Plus, ImageIcon, ChevronLeft, ChevronRight, Link as LinkIcon, Star, CheckSquare, Square, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./favorite-button";
import { ImageFilters } from "./image-filters";
import { BatchToolbar } from "./batch-toolbar";
import { ExportMenu } from "./export-menu";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useImageFilters, type FilterType, type SortBy } from "@/hooks/use-image-filters";
import { useBatchSelection } from "@/hooks/use-batch-selection";
import JSZip from "jszip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";
import { DownloadDialog } from "./download-dialog";
import {
  getImageDisplayName,
  buildDownloadFilename,
  buildDefaultFilename,
  sanitizeFilename,
} from "@/hooks/use-image-names";

const typeLabels: Record<string, string> = {
  original: "Original",
  bg_removed: "BG Removed",
  ai_background: "AI BG",
  generated: "Generated",
  typography: "Typography",
  upscaled: "Upscaled",
  relit: "Relit",
  skin_enhanced: "Enhanced",
};

const typeDots: Record<string, string> = {
  original: "bg-white/40",
  bg_removed: "bg-primary",
  ai_background: "bg-primary",
  generated: "bg-primary",
  typography: "bg-primary",
  upscaled: "bg-primary",
  relit: "bg-primary",
  skin_enhanced: "bg-primary",
};

interface ImageGalleryProps {
  onUpload?: (file: File) => void;
}

export function ImageGallery({ onUpload }: ImageGalleryProps) {
  const images = useStudioStore((s) => s.images);
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const setActiveImage = useStudioStore((s) => s.setActiveImage);
  const removeImage = useStudioStore((s) => s.removeImage);
  const toggleFavorite = useStudioStore((s) => s.toggleFavorite);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { studioRequest } = useStudioApi();

  // Filters state
  const [filters, setFilters] = useState({
    search: "",
    type: "all" as FilterType,
    sortBy: "newest" as SortBy,
  });

  const { filteredImages, totalCount, filteredCount } = useImageFilters(images, filters);
  
  const {
    selectedIds,
    isSelectionMode,
    selectedCount,
    toggleSelection,
    selectAll,
    selectRange,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    isSelected,
  } = useBatchSelection();

  // Auto-scroll to active image
  useEffect(() => {
    if (galleryRef.current && activeImageId) {
      const activeElement = galleryRef.current.querySelector(`[data-image-id="${activeImageId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeImageId]);

  // Track last clicked for shift-select
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  // ── Download dialog state ──────────────────────────────────────────────
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<StudioImage | null>(null);

  // ── Inline rename state ────────────────────────────────────────────────
  const renameImage = useStudioStore((s) => s.renameImage);
  const [renamingImageId, setRenamingImageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload PNG, JPEG, or WebP.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 10MB.");
        return;
      }

      onUpload?.(file);

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onUpload]
  );

  if (images.length === 0) return null;

  // Open download dialog for an image
  const openDownloadDialog = (image: StudioImage) => {
    setDownloadTarget(image);
    setDownloadDialogOpen(true);
  };

  // Perform the actual blob download with a given filename
  const triggerDownload = async (image: StudioImage, filename: string) => {
    try {
      const response = await fetch(image.url);
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
      window.open(image.url, "_blank");
    }
  };

  // Inline rename helpers
  const startRename = (image: StudioImage) => {
    setRenamingImageId(image.id);
    setRenameValue(getImageDisplayName(image));
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  };

  const commitRename = () => {
    if (renamingImageId && renameValue.trim()) {
      renameImage(renamingImageId, renameValue.trim());
      toast.success("Image renamed");
    }
    setRenamingImageId(null);
  };

  const handleCopyUrl = async (image: StudioImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success("Image URL copied to clipboard!");
    } catch (error) {
      handleError(error, { operation: "copy URL", silent: true });
    }
  };

  const handleToggleFavorite = async (imageId: string, newFavoriteState: boolean) => {
    toggleFavorite(imageId);
    
    try {
      await studioRequest(`/images/${imageId}/favorite`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: newFavoriteState }),
      });
    } catch (error) {
      // Revert on error
      toggleFavorite(imageId);
      throw error;
    }
  };

  // Batch operations
  const handleBatchDelete = async () => {
    const idsArray = Array.from(selectedIds);
    
    try {
      await studioRequest("/images/batch", {
        method: "POST",
        body: JSON.stringify({ imageIds: idsArray, operation: "delete" }),
      });
      
      idsArray.forEach((id) => removeImage(id));
      exitSelectionMode();
      toast.success(`Deleted ${idsArray.length} images`);
    } catch (error) {
      handleError(error, { operation: "delete images" });
    }
  };

  const handleBatchFavorite = async () => {
    const idsArray = Array.from(selectedIds);
    
    try {
      await studioRequest("/images/batch", {
        method: "POST",
        body: JSON.stringify({ imageIds: idsArray, operation: "favorite" }),
      });
      
      idsArray.forEach((id) => toggleFavorite(id));
      toast.success(`Favorited ${idsArray.length} images`);
    } catch (error) {
      handleError(error, { operation: "favorite images" });
    }
  };

  const handleBatchDownload = async () => {
    const idsArray = Array.from(selectedIds);
    const selectedImages = images.filter((img) => idsArray.includes(img.id));
    
    const toastId = toast.loading("Preparing download...");
    
    try {
      const zip = new JSZip();
      
      // Download all images and add to zip (using display names)
      for (const image of selectedImages) {
        try {
          const response = await fetch(image.url);
          if (!response.ok) continue;
          const blob = await response.blob();
          const filename = buildDownloadFilename(image);
          zip.file(filename, blob);
        } catch {
          // Skip failed downloads
          continue;
        }
      }
      
      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brandex-studio-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss(toastId);
      toast.success(`Downloaded ${selectedImages.length} images`);
    } catch (error) {
      toast.dismiss(toastId);
      handleError(error, { operation: "download images" });
    }
  };

  const handleDelete = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    // Server-side delete + local removal
    try {
      await studioRequest("/images/batch", {
        method: "POST",
        body: JSON.stringify({ imageIds: [imageId], operation: "delete" }),
      });
      removeImage(imageId);
      toast.success("Image removed");
    } catch (error) {
      handleError(error, { operation: "delete image" });
    }
  };

  const activeImage = images.find((i) => i.id === activeImageId);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-20 shrink-0 items-center gap-4 bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl px-5">
        {/* Filters */}
        <ImageFilters
          onFilterChange={setFilters}
          filteredCount={filteredCount}
          totalCount={totalCount}
        />

        <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent shrink-0" />

        {/* Navigation hint */}
        {filteredImages.length > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
            <ChevronLeft className="h-3 w-3" />
            <ChevronRight className="h-3 w-3" />
          </div>
        )}

        {/* Thumbnails */}
        <div ref={galleryRef} className="flex flex-1 items-center gap-2 overflow-x-auto py-2 scrollbar-thin relative z-10">
          {filteredImages.map((image) => {
            const isActive = activeImageId === image.id;
            const dotColor = typeDots[image.type] || "bg-white/40";

            const isImageSelected = isSelected(image.id);

            return (
              <Tooltip key={image.id}>
                <TooltipTrigger asChild>
                  <div className="relative group flex-shrink-0" data-image-id={image.id}>
                    <button
                      onClick={(e) => {
                        if (isSelectionMode) {
                          if (e.shiftKey && lastClickedId) {
                            const allIds = filteredImages.map((img) => img.id);
                            selectRange(lastClickedId, image.id, allIds);
                          } else {
                            toggleSelection(image.id);
                          }
                          setLastClickedId(image.id);
                        } else {
                          setActiveImage(image.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isSelectionMode) {
                          enterSelectionMode();
                        }
                        toggleSelection(image.id);
                        setLastClickedId(image.id);
                      }}
                      className={cn(
                        "relative h-14 w-14 overflow-hidden rounded-xl transition-all duration-300",
                        isImageSelected
                          ? "ring-2 ring-primary scale-105 shadow-[0_0_10px_0_rgba(0,235,2,0.5)]"
                          : isActive
                          ? "scale-105 shadow-[0_0_10px_0_rgba(0,0,0,0.5)]"
                          : "shadow-[0_0_6px_0_rgba(0,0,0,0.4)] hover:scale-105 hover:shadow-[0_0_8px_0_rgba(255,255,255,0.2)]"
                      )}
                    >
                      <img
                        src={image.url}
                        alt={typeLabels[image.type] || image.type}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {/* Type dot indicator */}
                      <div
                        className={cn(
                          "absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-black/50 shadow-lg transition-all duration-300",
                          dotColor,
                          isActive && "scale-125"
                        )}
                      />
                      {/* Favorite star indicator */}
                      {image.isFavorite && !isSelectionMode && (
                        <div className="absolute top-1 left-1">
                          <Star className="h-3 w-3 fill-primary text-primary drop-shadow-lg" />
                        </div>
                      )}

                      {/* Selection checkbox */}
                      {isSelectionMode && (
                        <div className="absolute top-1 left-1">
                          {isImageSelected ? (
                            <CheckSquare className="h-4 w-4 fill-primary text-black" />
                          ) : (
                            <Square className="h-4 w-4 text-white/40" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Action buttons - visible on hover (hide in selection mode) */}
                    {!isSelectionMode && (
                      <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(image);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#141517] text-white/70 shadow-[0_0_8px_0_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 hover:text-white"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(image.id, !image.isFavorite);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#141517] text-white shadow-[0_0_8px_0_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110"
                      >
                        <Star className={cn("h-3 w-3", image.isFavorite && "fill-primary text-primary")} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, image.id)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-100 transition-all duration-300 hover:bg-red-600 hover:scale-110 shadow-lg shadow-red-500/50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)] max-w-[200px]"
                >
                  <p className="text-xs font-semibold text-white truncate">
                    {getImageDisplayName(image)}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {typeLabels[image.type] || image.type}
                  </p>
                  {image.creditsCost > 0 && (
                    <p className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5">
                      <Coins className="h-3 w-3" />
                      {image.creditsCost} credits
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Add new image button */}
          {onUpload && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group/add flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[#141517] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_8px_0_rgba(0,0,0,0.4)]"
                >
                  <Plus className="h-5 w-5 text-white/30 transition-all duration-300 group-hover/add:text-primary group-hover/add:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
              >
                <p className="text-xs font-semibold text-white">
                  Add new image
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Hidden file input for new uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Selection Mode Toggle */}
        {!isSelectionMode && images.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-300 rounded-xl hover:scale-105"
                onClick={enterSelectionMode}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
            >
              <p className="text-xs font-semibold text-white">Select Multiple</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Quick actions for active image */}
        {activeImage && !isSelectionMode && (
          <div className="flex items-center gap-2 shrink-0 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-300 rounded-xl hover:scale-105"
                  onClick={() => handleCopyUrl(activeImage)}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
              >
                <p className="text-xs font-semibold text-white">Copy URL</p>
              </TooltipContent>
            </Tooltip>

            <ExportMenu imageId={activeImage.id} />
          </div>
        )}

        {/* Batch Toolbar */}
        {isSelectionMode && selectedCount > 0 && (
          <BatchToolbar
            selectedCount={selectedCount}
            totalCount={filteredImages.length}
            selectedIds={selectedIds}
            onClearSelection={exitSelectionMode}
            onSelectAll={() => selectAll(filteredImages.map((img) => img.id))}
            onBatchDelete={handleBatchDelete}
            onBatchFavorite={handleBatchFavorite}
            onBatchDownload={handleBatchDownload}
          />
        )}

        {/* Inline rename popover */}
        {renamingImageId && (
          <>
            <div className="fixed inset-0 z-40" onClick={commitRename} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 rounded-xl bg-[#141517] shadow-[0_0_20px_0_rgba(0,0,0,0.8)] px-3 py-2">
                <Pencil className="h-3.5 w-3.5 text-white/40 shrink-0" />
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingImageId(null);
                  }}
                  className="bg-transparent text-sm text-white/90 font-medium outline-none w-48 placeholder:text-white/30"
                  placeholder="Image name..."
                  spellCheck={false}
                />
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={commitRename}
                >
                  Save
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Download name dialog */}
      {downloadTarget && (
        <DownloadDialog
          open={downloadDialogOpen}
          onOpenChange={setDownloadDialogOpen}
          defaultName={getImageDisplayName(downloadTarget)}
          format={downloadTarget.fileFormat?.replace("image/", "") || "png"}
          onDownload={(filename) => {
            const ext = downloadTarget.fileFormat?.replace("image/", "") || "png";
            triggerDownload(downloadTarget, `${sanitizeFilename(filename)}.${ext}`);
          }}
          onSkip={() => {
            triggerDownload(downloadTarget, buildDefaultFilename(downloadTarget));
          }}
        />
      )}
    </TooltipProvider>
  );
}
