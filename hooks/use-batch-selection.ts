/**
 * Batch Selection Hook
 * Manages multi-select state for images
 */

"use client";

import { useState, useCallback } from "react";

export function useBatchSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRange = useCallback((startId: string, endId: string, allIds: string[]) => {
    const startIndex = allIds.indexOf(startId);
    const endIndex = allIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex 
      ? [startIndex, endIndex] 
      : [endIndex, startIndex];
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = from; i <= to; i++) {
        next.add(allIds[i]);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    isSelectionMode,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    isSelected: (id: string) => selectedIds.has(id),
  };
}
