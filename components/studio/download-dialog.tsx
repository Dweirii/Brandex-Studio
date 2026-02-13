/**
 * Download Dialog
 *
 * Appears before any image download / export, letting the user
 * enter a custom filename or skip to the default.
 *
 * Usage:
 *   <DownloadDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     defaultName="BG Removed_a1b2c3"
 *     format="png"
 *     onDownload={(filename) => triggerDownload(filename)}
 *     onSkip={() => triggerDownload(defaultFilename)}
 *   />
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, SkipForward } from "lucide-react";

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled display name (without extension). */
  defaultName: string;
  /** File extension shown as a suffix (e.g. "png", "jpg"). */
  format?: string;
  /** Called with the user-entered filename (no extension). */
  onDownload: (filename: string) => void;
  /** Called when user clicks Skip — download with default name. */
  onSkip: () => void;
}

export function DownloadDialog({
  open,
  onOpenChange,
  defaultName,
  format = "png",
  onDownload,
  onSkip,
}: DownloadDialogProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and auto-select when opened
  useEffect(() => {
    if (open) {
      setName(defaultName);
      // Focus + select after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultName]);

  const handleDownload = () => {
    const trimmed = name.trim();
    onDownload(trimmed || defaultName);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Save Image As</DialogTitle>
          <DialogDescription>
            Enter a filename or skip to use the default name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Filename input */}
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={defaultName}
              className="flex-1 font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-sm font-mono text-muted-foreground shrink-0">
              .{format}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="gap-2"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip (Default)
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
