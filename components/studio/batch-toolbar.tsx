/**
 * Batch Operations Toolbar
 * Shows when images are selected, provides bulk actions
 */

"use client";

import { Download, Trash2, Star, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import JSZip from "jszip";

interface BatchToolbarProps {
  selectedCount: number;
  totalCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBatchDelete: () => Promise<void>;
  onBatchFavorite: () => Promise<void>;
  onBatchDownload: () => Promise<void>;
}

export function BatchToolbar({
  selectedCount,
  totalCount,
  selectedIds,
  onClearSelection,
  onSelectAll,
  onBatchDelete,
  onBatchFavorite,
  onBatchDownload,
}: BatchToolbarProps) {
  const allSelected = selectedCount === totalCount;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl bg-[#141517] shadow-[0_0_20px_0_rgba(0,0,0,0.8)] px-5 py-3 animate-in slide-in-from-bottom-5 duration-300">
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">
          {selectedCount} selected
        </span>
        <div className="h-5 w-px bg-white/10" />
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="h-8 text-xs text-white/60 hover:text-white"
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Batch Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchFavorite}
          className="h-8 gap-2 text-white/60 hover:text-primary hover:bg-primary/10"
        >
          <Star className="h-3.5 w-3.5" />
          Favorite
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchDownload}
          className="h-8 gap-2 text-white/60 hover:text-white hover:bg-white/[0.08]"
        >
          <Download className="h-3.5 w-3.5" />
          Download All
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchDelete}
          className="h-8 gap-2 text-white/60 hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <div className="h-5 w-px bg-white/10" />

      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08]"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
