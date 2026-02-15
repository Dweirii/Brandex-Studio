"use client";

import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Coins, Palette, History, GitCompare, HelpCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredits } from "@/hooks/use-credits";
import { useStudioStore } from "@/stores/use-studio-store";
import { StudioLogo } from "./studio-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const backgrounds = [
  { id: "transparent", label: "Transparent", icon: "◧" },
  { id: "white", label: "White", icon: "⬜" },
  { id: "dark", label: "Dark", icon: "▪" },
  { id: "black", label: "Black", icon: "⬛" },
] as const;

interface StudioHeaderProps {
  onOpenGuide?: () => void;
}

export function StudioHeader({ onOpenGuide }: StudioHeaderProps) {
  const { balance, isLoading } = useCredits();
  const projectName = useStudioStore((s) => s.projectName);
  const closeProject = useStudioStore((s) => s.closeProject);
  const canvasBackground = useStudioStore((s) => s.canvasBackground);
  const setCanvasBackground = useStudioStore((s) => s.setCanvasBackground);
  const activeImageId = useStudioStore((s) => s.activeImageId);
  const images = useStudioStore((s) => s.images);
  const showHistory = useStudioStore((s) => s.showHistory);
  const setShowHistory = useStudioStore((s) => s.setShowHistory);
  const showComparison = useStudioStore((s) => s.showComparison);
  const setShowComparison = useStudioStore((s) => s.setShowComparison);

  const activeImage = images.find((img) => img.id === activeImageId);
  const hasParent = activeImage?.parentId != null;

  // Get Store URL from env
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000";

  return (
    <header className="group/header flex h-14 shrink-0 items-center justify-between bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl px-2 lg:px-4 relative">
      {/* Left: Back + Logo + Project Name */}
      <div className="flex items-center gap-2 lg:gap-3 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:scale-105 active:scale-95"
          onClick={closeProject}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Button>

        <div className="h-4 w-px bg-gradient-to-b from-transparent via-white/[0.15] to-transparent" />

        <StudioLogo />

        {projectName && (
          <>
            <div className="hidden lg:block h-3 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent" />
            <span className="hidden lg:inline text-xs font-medium text-white/50 max-w-[200px] truncate transition-colors duration-300 hover:text-white/70">
              {projectName}
            </span>
          </>
        )}
      </div>

      {/* Right: Quick Actions + Background Toggle + Credits + User */}
      <div className="flex items-center gap-1.5 lg:gap-3 relative z-10">
        {activeImage && <div className="h-4 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent" />}
        {/* Quick View Actions */}
        {activeImage && (
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all duration-300",
                      showHistory
                        ? "text-primary bg-primary/10"
                        : "text-white/40 hover:text-white hover:bg-white/[0.08]"
                    )}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                  <p className="text-xs font-semibold text-white">History (H)</p>
                </TooltipContent>
              </Tooltip>

              {hasParent && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowComparison(!showComparison)}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all duration-300",
                        showComparison
                          ? "text-primary bg-primary/10"
                          : "text-white/40 hover:text-white hover:bg-white/[0.08]"
                      )}
                    >
                      <GitCompare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
                    <p className="text-xs font-semibold text-white">Compare (C)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}

        {activeImage && <div className="h-4 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent" />}

        {/* Canvas Background Selector */}
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.06] p-1">
            {backgrounds.map((bg) => (
              <Tooltip key={bg.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCanvasBackground(bg.id)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all duration-300",
                      canvasBackground === bg.id
                        ? "bg-primary text-black shadow-[0_0_8px_0_rgba(0,0,0,0.4)] scale-105"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
                    )}
                  >
                    {bg.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
                >
                  <p className="text-xs font-semibold text-white">{bg.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="h-4 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent" />

        {/* Help / Guide button */}
        {onOpenGuide && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenGuide}
                  className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:scale-105"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
              >
                <p className="text-xs font-semibold text-white">Guide</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="group/credits flex items-center gap-2 rounded-xl bg-white/[0.06] px-3.5 py-2 transition-all duration-300 hover:shadow-[0_0_8px_0_rgba(255,184,0,0.3)] hover:scale-[1.02]">
          <Coins className="h-3.5 w-3.5 text-amber-400/90 transition-all duration-300 group-hover/credits:rotate-12 group-hover/credits:scale-110" />
          {isLoading ? (
            <Skeleton className="h-4 w-12 bg-white/10 rounded-md" />
          ) : (
            <span className="font-mono text-sm font-semibold text-white/80 transition-colors duration-300 group-hover/credits:text-white tabular-nums">
              {balance.toLocaleString()}
            </span>
          )}
        </div>
        <div className="transition-all duration-300 hover:scale-105 active:scale-95">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-2 ring-white/[0.08] hover:ring-primary/30 transition-all duration-300",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
