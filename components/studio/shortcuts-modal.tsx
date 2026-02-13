/**
 * Keyboard Shortcuts Cheat Sheet Modal
 * Shows all available keyboard shortcuts organized by category
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS, SHORTCUT_CATEGORIES } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { Keyboard } from "lucide-react";

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  // Listen for ? key to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Quick reference for all available shortcuts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {SHORTCUT_CATEGORIES.map((category) => {
            const shortcuts = KEYBOARD_SHORTCUTS.filter(
              (s) => s.category === category
            );

            if (shortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-2.5 transition-colors hover:bg-white/[0.05]"
                    >
                      <span className="text-sm text-white/70">
                        {shortcut.description}
                      </span>
                      <kbd className="flex items-center gap-1 rounded-md bg-[#0a0a0a] px-2.5 py-1.5 font-mono text-xs font-semibold text-white/80 shadow-[0_0_8px_0_rgba(0,0,0,0.4)]">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-primary/10 p-4">
          <p className="text-xs text-white/60 text-center">
            Press <kbd className="px-2 py-1 rounded bg-white/10 font-mono text-white/80">?</kbd> anytime to show this menu
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
