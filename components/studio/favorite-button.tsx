/**
 * Favorite/Star Button Component
 * Toggles favorite status for images
 */

"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";

interface FavoriteButtonProps {
  imageId: string;
  isFavorite: boolean;
  onToggle: (imageId: string, isFavorite: boolean) => Promise<void>;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({
  imageId,
  isFavorite,
  onToggle,
  className,
  size = "md",
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      await onToggle(imageId, !isFavorite);
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      handleError(error, { operation: "update favorite" });
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "transition-all duration-300 hover:scale-110 active:scale-95",
        isLoading && "opacity-50 pointer-events-none",
        className
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          sizeClasses[size],
          "transition-all duration-300",
          isFavorite
            ? "fill-primary text-primary drop-shadow-[0_0_4px_rgba(0,235,2,0.5)]"
            : "text-white/30 hover:text-white/60"
        )}
      />
    </button>
  );
}
