/**
 * Mask Canvas Overlay
 *
 * Renders an interactive brush-painting canvas on top of the image.
 * Users paint over the area they want to edit/remove.
 * The painted area becomes the mask sent to the inpainting API.
 */

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  useMaskPainterStore,
  drawBrushStroke,
} from "@/hooks/use-mask-painter";

interface MaskCanvasProps {
  /** Ref to the <img> element this mask overlays */
  imageRef: React.RefObject<HTMLImageElement | null>;
  /** Current zoom level (to scale brush correctly) */
  zoom: number;
}

/** Semi-transparent highlight color for the painted mask */
const MASK_COLOR = "rgba(0, 235, 2, 0.35)";

export function MaskCanvas({ imageRef, zoom }: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const brushSize = useMaskPainterStore((s) => s.brushSize);
  const setHasMask = useMaskPainterStore((s) => s.setHasMask);

  // Callback ref — keeps canvasRef in sync whenever the DOM node appears/disappears
  const canvasCallbackRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
    },
    []
  );

  // ── Sync canvas resolution with the image's rendered size ──────────────────

  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const sync = () => {
      // clientWidth/clientHeight give the layout size WITHOUT CSS transforms
      const w = img.clientWidth;
      const h = img.clientHeight;
      if (w > 0 && h > 0) {
        setDims((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h }
        );
      }
    };

    sync();

    // Re-sync when the image loads or resizes
    img.addEventListener("load", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(img);

    return () => {
      img.removeEventListener("load", sync);
      observer.disconnect();
    };
  }, [imageRef]);

  // Set canvas pixel resolution when dims change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.width === 0) return;
    canvas.width = dims.width;
    canvas.height = dims.height;
  }, [dims]);

  // ── Coordinate conversion ──────────────────────────────────────────────────

  const getCanvasPos = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    },
    []
  );

  // ── Drawing handlers ───────────────────────────────────────────────────────

  // Brush size in canvas-pixel space (undo the zoom scaling)
  const scaledBrush = brushSize / zoom;

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const pos = getCanvasPos(e);
      if (!pos) return;

      isDrawing.current = true;
      lastPos.current = pos;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = MASK_COLOR;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, scaledBrush, 0, Math.PI * 2);
      ctx.fill();

      setHasMask(true);
    },
    [getCanvasPos, scaledBrush, setHasMask]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing.current || !lastPos.current) return;
      e.preventDefault();
      e.stopPropagation();

      const pos = getCanvasPos(e);
      if (!pos) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = MASK_COLOR;
      drawBrushStroke(
        ctx,
        lastPos.current.x,
        lastPos.current.y,
        pos.x,
        pos.y,
        scaledBrush
      );
      lastPos.current = pos;
    },
    [getCanvasPos, scaledBrush]
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  // ── Brush cursor ───────────────────────────────────────────────────────────

  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });
      handlePointerMove(e);
    },
    [handlePointerMove]
  );

  const handleMouseLeave = useCallback(() => {
    setCursor((c) => ({ ...c, visible: false }));
    handlePointerUp();
  }, [handlePointerUp]);

  // ── Cursor size in CSS pixels ──────────────────────────────────────────────

  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const cssScale = canvasRect && dims.width > 0 ? canvasRect.width / dims.width : 1;
  const cursorCSS = scaledBrush * 2 * cssScale;

  if (dims.width === 0 || dims.height === 0) return null;

  return (
    <>
      <canvas
        ref={canvasCallbackRef}
        data-mask-canvas
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: 10,
          cursor: "none",
          touchAction: "none",
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* Custom brush cursor */}
      {cursor.visible && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-primary/80 shadow-[0_0_6px_0_rgba(0,235,2,0.4)]"
          style={{
            zIndex: 20,
            width: cursorCSS,
            height: cursorCSS,
            left: cursor.x - cursorCSS / 2,
            top: cursor.y - cursorCSS / 2,
            transition: "width 0.1s, height 0.1s",
          }}
        />
      )}
    </>
  );
}
