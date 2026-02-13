"use client";

import { useStudioStore } from "@/stores/use-studio-store";
import { Coins, Upload, Wand2, ZoomIn, ZoomOut, Maximize2, Info, Minimize2, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { CanvasGrid, type GridType } from "./canvas-grid";
import { GenerationLoader } from "./generation-loader";
import { useStudioApi } from "@/hooks/use-studio-api";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";
import {
  useColorPickerStore,
  loadImageToCanvas,
  getPixelColor,
  createSampledColor,
  drawMagnifier,
} from "@/hooks/use-color-picker";
import {
  useAdjustmentsStore,
  hasAdjustmentChanges,
  buildCSSFilter,
} from "@/hooks/use-image-adjustments";
import { useMaskPainterStore } from "@/hooks/use-mask-painter";
import { MaskCanvas } from "./mask-canvas";

const typeLabels: Record<string, string> = {
  original: "Original",
  bg_removed: "Background Removed",
  ai_background: "AI Background",
  generated: "AI Generated",
  typography: "Typography",
  upscaled: "Upscaled",
  relit: "Relit",
  skin_enhanced: "Skin Enhanced",
};

const typeColors: Record<string, string> = {
  original: "bg-white/10 text-white/60",
  bg_removed: "bg-primary/15 text-primary/80",
  ai_background: "bg-primary/15 text-primary/80",
  generated: "bg-primary/15 text-primary/80",
  typography: "bg-primary/15 text-primary/80",
  upscaled: "bg-primary/15 text-primary/80",
  relit: "bg-primary/15 text-primary/80",
  skin_enhanced: "bg-primary/15 text-primary/80",
};

export function Canvas() {
  const images = useStudioStore((s) => s.images);
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const isProcessing = useStudioStore((s) => s.isProcessing);
  const processingMessage = useStudioStore((s) => s.processingMessage);
  const canvasBackground = useStudioStore((s) => s.canvasBackground);
  const gridOverlay = useStudioStore((s) => s.gridOverlay);
  const setGridOverlay = useStudioStore((s) => s.setGridOverlay);
  const toggleFavorite = useStudioStore((s) => s.toggleFavorite);
  const showHistory = useStudioStore((s) => s.showHistory);
  const setShowHistory = useStudioStore((s) => s.setShowHistory);
  const showComparison = useStudioStore((s) => s.showComparison);
  const setShowComparison = useStudioStore((s) => s.setShowComparison);
  const selectedTool = useStudioStore((s) => s.selectedTool);
  const setTool = useStudioStore((s) => s.setTool);

  const activeImage = images.find((img) => img.id === activeImageId);

  // Fullscreen hook
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { studioRequest } = useStudioApi();

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ── AI Edit / Mask Painting State ───────────────────────────────────────
  const isAiEditing = selectedTool === "ai_edit";
  const maskHasPaint = useMaskPainterStore((s) => s.hasMask);

  // ── Color Picker / Eyedropper State ──────────────────────────────────────
  const isColorPicking = selectedTool === "color_picker";
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const isLoadingSourceRef = useRef(false);
  const [eyedropperData, setEyedropperData] = useState<{
    screenX: number;
    screenY: number;
    color: { hex: string };
  } | null>(null);

  // ── Image Adjustments State ──────────────────────────────────────────────
  const adjBrightness = useAdjustmentsStore((s) => s.brightness);
  const adjContrast = useAdjustmentsStore((s) => s.contrast);
  const adjSaturation = useAdjustmentsStore((s) => s.saturation);
  const adjTargetImageId = useAdjustmentsStore((s) => s.targetImageId);
  const isAdjusting = selectedTool === "adjustments";
  const adjValues = { brightness: adjBrightness, contrast: adjContrast, saturation: adjSaturation };
  const adjHasChanges = hasAdjustmentChanges(adjValues);
  const adjCSSFilter = adjHasChanges ? buildCSSFilter(adjValues) : "none";

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeImageId]);

  // ── Eyedropper: load image into offscreen canvas for pixel sampling ────
  useEffect(() => {
    if (!isColorPicking || !activeImage) {
      sourceCanvasRef.current = null;
      setEyedropperData(null);
      return;
    }

    if (isLoadingSourceRef.current) return;
    isLoadingSourceRef.current = true;

    let cancelled = false;
    loadImageToCanvas(activeImage.url)
      .then((canvas) => {
        if (!cancelled) sourceCanvasRef.current = canvas;
      })
      .catch((err) => {
        console.error("[Eyedropper] Failed to load image:", err);
      })
      .finally(() => {
        isLoadingSourceRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [isColorPicking, activeImage]);

  // Clear dominant colors when the active image changes
  useEffect(() => {
    useColorPickerStore.getState().setDominantColors([]);
  }, [activeImageId]);

  // Reset adjustments when switching to a different image
  useEffect(() => {
    if (activeImageId && activeImageId !== adjTargetImageId) {
      useAdjustmentsStore.getState().setTargetImageId(activeImageId);
    }
  }, [activeImageId, adjTargetImageId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          navigateToPreviousImage();
          break;
        case "ArrowRight":
          e.preventDefault();
          navigateToNextImage();
          break;
        case "=":
        case "+":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          handleResetView();
          break;
        case "i":
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen(containerRef.current || undefined);
          break;
        case "g":
        case "G":
          e.preventDefault();
          cycleGridOverlay();
          break;
        case "s":
        case "S":
          e.preventDefault();
          if (activeImage) {
            handleToggleFavoriteShortcut();
          }
          break;
        case "h":
        case "H":
          e.preventDefault();
          if (activeImage) {
            setShowHistory(!showHistory);
          }
          break;
        case "c":
        case "C":
          e.preventDefault();
          if (activeImage && images.length > 1) {
            setShowComparison(!showComparison);
          }
          break;
        case "p":
        case "P":
          e.preventDefault();
          if (activeImage) {
            setTool(selectedTool === "color_picker" ? null : "color_picker");
          }
          break;
        case "a":
          e.preventDefault();
          if (activeImage) {
            setTool(selectedTool === "adjustments" ? null : "adjustments");
          }
          break;
        case "[":
          if (isAiEditing) {
            e.preventDefault();
            useMaskPainterStore.getState().setBrushSize(
              Math.max(5, useMaskPainterStore.getState().brushSize - 5)
            );
          }
          break;
        case "]":
          if (isAiEditing) {
            e.preventDefault();
            useMaskPainterStore.getState().setBrushSize(
              Math.min(100, useMaskPainterStore.getState().brushSize + 5)
            );
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageId, images, zoom, pan, showInfo, toggleFullscreen, gridOverlay, activeImage, showHistory, showComparison, setShowHistory, setShowComparison, selectedTool, setTool]);

  // Cycle through grid overlays
  const cycleGridOverlay = () => {
    const grids: GridType[] = ["none", "thirds", "center", "golden"];
    const currentIndex = grids.indexOf(gridOverlay);
    const nextIndex = (currentIndex + 1) % grids.length;
    setGridOverlay(grids[nextIndex]);
  };

  // Toggle favorite with keyboard
  const handleToggleFavoriteShortcut = async () => {
    if (!activeImage) return;

    const newFavoriteState = !activeImage.isFavorite;
    toggleFavorite(activeImage.id);
    
    try {
      await studioRequest(`/images/${activeImage.id}/favorite`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: newFavoriteState }),
      });
      toast.success(newFavoriteState ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toggleFavorite(activeImage.id); // Revert
      handleError(error, { operation: "update favorite" });
    }
  };

  const navigateToPreviousImage = () => {
    const currentIndex = images.findIndex((img) => img.id === activeImageId);
    if (currentIndex > 0) {
      useStudioStore.getState().setActiveImage(images[currentIndex - 1].id);
    }
  };

  const navigateToNextImage = () => {
    const currentIndex = images.findIndex((img) => img.id === activeImageId);
    if (currentIndex < images.length - 1) {
      useStudioStore.getState().setActiveImage(images[currentIndex + 1].id);
    }
  };

  // Load image dimensions — with cleanup to prevent stale updates
  useEffect(() => {
    if (!activeImage) return;
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setImageDimensions({ width: 0, height: 0 });
    };
    img.src = activeImage.url;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [activeImage]);

  // Handle zoom with mouse wheel (always available, including in color picker mode)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 5);
    setZoom(newZoom);
  };

  // Handle pan with drag (disabled in color picker mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isColorPicking || isAiEditing) return;
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isColorPicking) {
      handleEyedropperMove(e);
      return;
    }
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeaveContainer = () => {
    if (isColorPicking) {
      setEyedropperData(null);
      useColorPickerStore.getState().setHoverColor(null);
    }
    setIsDragging(false);
  };

  // ── Eyedropper Handlers ────────────────────────────────────────────────

  const handleEyedropperMove = useCallback(
    (e: React.MouseEvent) => {
      const imgEl = imageRef.current;
      const source = sourceCanvasRef.current;
      if (!imgEl || !source) {
        setEyedropperData(null);
        useColorPickerStore.getState().setHoverColor(null);
        return;
      }

      const rect = imgEl.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      // Outside the image bounds
      if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
        setEyedropperData(null);
        useColorPickerStore.getState().setHoverColor(null);
        return;
      }

      const pixelX = Math.floor(relX * source.width);
      const pixelY = Math.floor(relY * source.height);

      const rgb = getPixelColor(source, pixelX, pixelY);
      const color = createSampledColor(rgb.r, rgb.g, rgb.b, {
        x: relX,
        y: relY,
      });

      // Draw magnifier (imperative, no frame delay)
      drawMagnifier(magnifierCanvasRef.current, source, pixelX, pixelY);

      setEyedropperData({
        screenX: e.clientX,
        screenY: e.clientY,
        color: { hex: color.hex },
      });
      useColorPickerStore.getState().setHoverColor(color);
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isColorPicking) return;

      const imgEl = imageRef.current;
      const source = sourceCanvasRef.current;
      if (!imgEl || !source) return;

      const rect = imgEl.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

      const pixelX = Math.floor(relX * source.width);
      const pixelY = Math.floor(relY * source.height);

      const rgb = getPixelColor(source, pixelX, pixelY);
      const color = createSampledColor(rgb.r, rgb.g, rgb.b, {
        x: relX,
        y: relY,
      });

      useColorPickerStore.getState().addColor(color);
      toast.success(`Sampled ${color.hex}`);
    },
    [isColorPicking]
  );

  /** Smart positioning: keep the magnifier within the viewport. */
  const getMagnifierPosition = () => {
    if (!eyedropperData) return { left: -9999, top: -9999 };
    const offset = 24;
    const magW = 140;
    const magH = 196;
    let left = eyedropperData.screenX + offset;
    let top = eyedropperData.screenY - magH / 2;

    if (left + magW > window.innerWidth - 8) {
      left = eyedropperData.screenX - offset - magW;
    }
    if (top < 8) top = 8;
    if (top + magH > window.innerHeight - 8) {
      top = window.innerHeight - magH - 8;
    }
    return { left, top };
  };

  // Quick actions
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.25, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.25, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Background styles based on selection
  const getBackgroundStyle = () => {
    switch (canvasBackground) {
      case "white":
        return "bg-white";
      case "black":
        return "bg-black";
      case "dark":
        return "bg-[#0a0a0a]";
      case "transparent":
      default:
        return "";
    }
  };

  if (isProcessing) {
    return <GenerationLoader />;
  }

  if (!activeImage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-12 animate-in fade-in duration-700">
        <div className="flex items-center gap-6 text-white/[0.12]">
          <Upload className="h-10 w-10 animate-pulse" />
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
          <Wand2 className="h-10 w-10 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-white/40">
            Upload an image or use a generation tool
          </p>
          <p className="text-sm text-white/20">
            Your processed images will appear here
          </p>
        </div>
      </div>
    );
  }

  const label = typeLabels[activeImage.type] || activeImage.type;
  const colorClass = typeColors[activeImage.type] || "bg-white/10 text-white/60";

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden p-12 animate-in fade-in zoom-in-95 duration-700 transition-colors duration-300",
        getBackgroundStyle(),
        isAiEditing
          ? "cursor-none"
          : isColorPicking
          ? "cursor-crosshair"
          : zoom > 1 && isDragging
          ? "cursor-grabbing"
          : zoom > 1
          ? "cursor-grab"
          : "cursor-default"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeaveContainer}
      onClick={handleCanvasClick}
    >
      {/* Professional checkerboard background for transparent mode */}
      {canvasBackground === "transparent" && (
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #ffffff 25%, transparent 25%), linear-gradient(-45deg, #ffffff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ffffff 75%), linear-gradient(-45deg, transparent 75%, #ffffff 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        />
      )}

      {/* Image container with zoom and pan */}
      <div 
        className="relative group w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          className="relative max-h-full max-w-full"
          style={{ transform: `scale(${zoom})`, display: "inline-block" }}
        >
          <img
            ref={imageRef}
            src={activeImage.url}
            alt="Studio canvas"
            className="max-h-full max-w-full object-contain shadow-[0_0_20px_0_rgba(0,0,0,0.5)] transition-all duration-200"
            style={{
              filter: isAdjusting && adjHasChanges ? adjCSSFilter : undefined,
            }}
            draggable={false}
            onError={() => {
              toast.error("Image Unavailable", {
                description: "The image could not be loaded. The URL may have expired — try selecting a different image.",
                duration: 6000,
              });
            }}
          />

          {/* Mask painting overlay for AI Edit tool */}
          {isAiEditing && (
            <MaskCanvas imageRef={imageRef} zoom={zoom} />
          )}
        </div>
        
        {/* Grid Overlay */}
        <CanvasGrid type={gridOverlay} />
      </div>

      {/* Zoom Controls */}
      <TooltipProvider delayDuration={0}>
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] text-white/70 hover:text-white transition-all hover:scale-105"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <p className="text-xs font-semibold text-white">Zoom In (Scroll Up)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] text-white/70 hover:text-white transition-all hover:scale-105"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <p className="text-xs font-semibold text-white">Zoom Out (Scroll Down)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] text-white/70 hover:text-white transition-all hover:scale-105"
                onClick={handleResetView}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <p className="text-xs font-semibold text-white">Reset View</p>
            </TooltipContent>
          </Tooltip>

          <div className="h-px bg-white/10 my-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] transition-all hover:scale-105",
                  isFullscreen ? "text-primary" : "text-white/70 hover:text-white"
                )}
                onClick={() => toggleFullscreen(containerRef.current || undefined)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <p className="text-xs font-semibold text-white">{isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] transition-all hover:scale-105",
                  showInfo ? "text-primary" : "text-white/70 hover:text-white"
                )}
                onClick={() => setShowInfo(!showInfo)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <p className="text-xs font-semibold text-white">Image Info (I)</p>
            </TooltipContent>
          </Tooltip>

          {images.length > 1 && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-9 w-9 rounded-xl bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:bg-[#1a1a1c] transition-all hover:scale-105",
                      showComparison ? "text-primary" : "text-white/70 hover:text-white"
                    )}
                    onClick={() => setShowComparison(!showComparison)}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                  <p className="text-xs font-semibold text-white">Compare (C)</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>

      {/* Enhanced Image Info Panel */}
      {showInfo && activeImage && (
        <div className="absolute top-6 left-6 rounded-xl bg-[#141517] backdrop-blur-2xl px-4 py-3 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-left-5 duration-300 min-w-[240px]">
          <div className="space-y-2 text-xs">
            {/* File Info */}
            <div className="pb-2 border-b border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                File Info
              </div>
              {activeImage.fileFormat && (
                <div className="flex items-center justify-between text-white/50">
                  <span className="font-semibold">Format:</span>
                  <span className="font-mono text-white/80">{activeImage.fileFormat}</span>
                </div>
              )}
              {activeImage.fileSize && (
                <div className="flex items-center justify-between text-white/50 mt-1">
                  <span className="font-semibold">Size:</span>
                  <span className="font-mono text-white/80">
                    {(activeImage.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>

            {/* Dimensions */}
            <div className="pb-2 border-b border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                Dimensions
              </div>
              {(activeImage.width && activeImage.height) ? (
                <div className="flex items-center justify-between text-white/50">
                  <span className="font-semibold">Resolution:</span>
                  <span className="font-mono text-white/80">
                    {activeImage.width} × {activeImage.height}px
                  </span>
                </div>
              ) : imageDimensions.width > 0 ? (
                <div className="flex items-center justify-between text-white/50">
                  <span className="font-semibold">Resolution:</span>
                  <span className="font-mono text-white/80">
                    {imageDimensions.width} × {imageDimensions.height}px
                  </span>
                </div>
              ) : null}
              {activeImage.colorSpace && (
                <div className="flex items-center justify-between text-white/50 mt-1">
                  <span className="font-semibold">Color:</span>
                  <span className="font-mono text-white/80">{activeImage.colorSpace}</span>
                </div>
              )}
            </div>

            {/* Processing */}
            <div className="pb-2 border-b border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                Processing
              </div>
              {activeImage.provider && (
                <div className="flex items-center justify-between text-white/50">
                  <span className="font-semibold">Provider:</span>
                  <span className="font-mono text-white/80 capitalize">{activeImage.provider}</span>
                </div>
              )}
              {activeImage.operation && (
                <div className="flex items-center justify-between text-white/50 mt-1">
                  <span className="font-semibold">Operation:</span>
                  <span className="font-mono text-white/80">{activeImage.operation.replace(/_/g, " ")}</span>
                </div>
              )}
              {activeImage.processingTime && (
                <div className="flex items-center justify-between text-white/50 mt-1">
                  <span className="font-semibold">Time:</span>
                  <span className="font-mono text-white/80">{(activeImage.processingTime / 1000).toFixed(2)}s</span>
                </div>
              )}
            </div>

            {/* Current View */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                Current View
              </div>
              <div className="flex items-center justify-between text-white/50">
                <span className="font-semibold">Zoom:</span>
                <span className="font-mono text-white/80">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-white/50 mt-1">
                <span className="font-semibold">Credits:</span>
                <span className="font-mono text-primary">{activeImage.creditsCost}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-24 left-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-1.5 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in fade-in duration-200">
          <span className="text-xs font-mono font-semibold text-white/70">{(zoom * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-8 left-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-2 shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">→</kbd>
            <span>Navigate</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Scroll</kbd>
            <span>Zoom</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">F</kbd>
            <span>Fullscreen</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">G</kbd>
            <span>Grid</span>
          </div>
        </div>
      </div>

      {/* Grid indicator */}
      {gridOverlay !== "none" && (
        <div className="absolute bottom-24 right-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-1.5 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in fade-in duration-200">
          <span className="text-xs font-semibold text-primary capitalize">{gridOverlay}</span>
        </div>
      )}

      {/* Type badge */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-[#141517] backdrop-blur-2xl px-4 py-2 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-105">
        <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-sm", colorClass)}>
          {label}
        </span>
        {activeImage.creditsCost > 0 && (
          <>
            <div className="h-3.5 w-px bg-gradient-to-b from-transparent via-white/[0.15] to-transparent" />
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/40">
              <Coins className="h-3 w-3" />
              {activeImage.creditsCost}
            </span>
          </>
        )}
      </div>

      {/* ── Eyedropper Magnifier ─────────────────────────────────────────── */}
      <div
        className="fixed z-100 pointer-events-none"
        style={{
          visibility:
            isColorPicking && eyedropperData ? "visible" : "hidden",
          ...getMagnifierPosition(),
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Magnified pixel ring */}
          <div className="rounded-full shadow-[0_0_24px_0_rgba(0,0,0,0.8)] ring-2 ring-white/30 overflow-hidden">
            <canvas
              ref={magnifierCanvasRef}
              width={140}
              height={140}
              style={{ width: 140, height: 140, display: "block" }}
            />
          </div>
          {/* Color label */}
          {eyedropperData?.color && (
            <div className="flex items-center gap-2 rounded-lg bg-[#141517]/95 backdrop-blur-sm px-3 py-1.5 shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
              <div
                className="h-4 w-4 rounded-sm ring-1 ring-white/20 shadow-inner"
                style={{ backgroundColor: eyedropperData.color.hex }}
              />
              <span className="font-mono text-xs font-bold text-white/90 tracking-wide">
                {eyedropperData.color.hex}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI Edit mode indicator */}
      {isAiEditing && !showInfo && (
        <div className="absolute top-6 left-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-2 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-left-5 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-white/70">
              Paint over the area to edit
            </span>
          </div>
        </div>
      )}

      {/* Color picker mode indicator — hide when info panel is open to avoid overlap */}
      {isColorPicking && !showInfo && (
        <div className="absolute top-6 left-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-2 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-left-5 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-white/70">
              Color Picker Active
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] text-white/40">
              P
            </kbd>
          </div>
        </div>
      )}

      {/* Adjustments active indicator */}
      {isAdjusting && adjHasChanges && !showInfo && !isColorPicking && (
        <div className="absolute top-6 left-6 rounded-lg bg-[#141517] backdrop-blur-2xl px-3 py-2 shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-left-5 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-white/70">
              Adjustments Preview
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] text-white/40">
              A
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
}
