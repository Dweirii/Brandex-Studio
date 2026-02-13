/**
 * Image Filters Panel
 * Provides filtering and sorting controls for the image gallery
 */

"use client";

import { useState } from "react";
import { Search, Filter, X, Star, Image as ImageIcon, Wand2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FilterType, SortBy } from "@/hooks/use-image-filters";

interface ImageFiltersProps {
  onFilterChange: (filters: {
    search: string;
    type: FilterType;
    sortBy: SortBy;
  }) => void;
  filteredCount: number;
  totalCount: number;
}

const filterTypes: { value: FilterType; label: string; icon: any }[] = [
  { value: "all", label: "All Images", icon: Layers },
  { value: "favorites", label: "Favorites", icon: Star },
  { value: "original", label: "Originals", icon: ImageIcon },
  { value: "edited", label: "Edited", icon: Filter },
  { value: "generated", label: "Generated", icon: Wand2 },
];

export function ImageFilters({ onFilterChange, filteredCount, totalCount }: ImageFiltersProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (updates: Partial<{ search: string; type: FilterType; sortBy: SortBy }>) => {
    const newSearch = updates.search !== undefined ? updates.search : search;
    const newType = updates.type !== undefined ? updates.type : type;
    const newSortBy = updates.sortBy !== undefined ? updates.sortBy : sortBy;

    setSearch(newSearch);
    setType(newType);
    setSortBy(newSortBy);

    onFilterChange({
      search: newSearch,
      type: newType,
      sortBy: newSortBy,
    });
  };

  const handleClearFilters = () => {
    handleChange({ search: "", type: "all", sortBy: "newest" });
  };

  const hasActiveFilters = search !== "" || type !== "all" || sortBy !== "newest";

  return (
    <div className="relative shrink-0">
      {/* Compact Filter Button */}
      {!isExpanded && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className={cn(
              "h-9 gap-2 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all rounded-xl",
              hasActiveFilters && "text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {filteredCount !== totalCount
                ? `${filteredCount} / ${totalCount}`
                : `${totalCount} images`}
            </span>
          </Button>
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="absolute top-0 left-0 right-0 bg-[#141517] rounded-xl shadow-[0_0_15px_0_rgba(0,0,0,0.6)] p-4 z-30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Filters
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08]"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search images..."
                value={search}
                onChange={(e) => handleChange({ search: e.target.value })}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-1 flex-wrap">
              {filterTypes.map((filterType) => {
                const Icon = filterType.icon;
                const isActive = type === filterType.value;
                
                return (
                  <button
                    key={filterType.value}
                    onClick={() => handleChange({ type: filterType.value })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300",
                      isActive
                        ? "bg-primary text-black shadow-[0_0_8px_0_rgba(0,0,0,0.4)]"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white/80"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {filterType.label}
                  </button>
                );
              })}
            </div>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => handleChange({ sortBy: value as SortBy })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="credits_high">Highest Credits</SelectItem>
                <SelectItem value="credits_low">Lowest Credits</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="w-full h-8 text-xs text-white/60 hover:text-white"
              >
                Clear Filters
              </Button>
            )}

            {/* Results Count */}
            <div className="pt-2 border-t border-white/10 text-center">
              <span className="text-xs text-white/50">
                Showing {filteredCount} of {totalCount} images
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
