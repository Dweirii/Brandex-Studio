/**
 * Fullscreen Mode Hook
 * Handles entering/exiting fullscreen mode with F key toggle
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if fullscreen is supported
  const isSupported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled);

  // Update fullscreen state when it changes
  useEffect(() => {
    if (!isSupported) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isSupported]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async (element?: HTMLElement) => {
    if (!isSupported) {
      console.warn("Fullscreen API is not supported");
      return;
    }

    const elem = element || document.documentElement;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error("Error entering fullscreen:", error);
    }
  }, [isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) return;

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
    }
  }, [isSupported]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(
    async (element?: HTMLElement) => {
      if (isFullscreen) {
        await exitFullscreen();
      } else {
        await enterFullscreen(element);
      }
    },
    [isFullscreen, enterFullscreen, exitFullscreen]
  );

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
