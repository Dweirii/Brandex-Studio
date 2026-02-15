"use client";

import {
  Eraser,
  ImagePlus,
  Paintbrush,
  Wand2,
  ZoomIn,
  Sun,
  Sparkles,
  Type,
  BrainCircuit,
  Pipette,
  SlidersHorizontal,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudioStore } from "@/stores/use-studio-store";
import { cn } from "@/lib/utils";

interface ToolItem {
  id:
    | "remove_bg"
    | "ai_background"
    | "ai_edit"
    | "generate_flux"
    | "generate_gemini"
    | "generate_typography"
    | "upscale"
    | "relight"
    | "skin_enhance"
    | "color_picker"
    | "adjustments"
    | "image_expand"
    | "gemini_ai_editor";
  label: string;
  icon: React.ReactNode;
  credits: number;
  enabled: boolean;
  requiresImage?: boolean;
}

interface ToolGroup {
  label: string;
  tools: ToolItem[];
}

const toolGroups: ToolGroup[] = [
  {
    label: "Background",
    tools: [
      {
        id: "remove_bg",
        label: "Remove BG",
        icon: <Eraser className="h-4 w-4" />,
        credits: 5,
        enabled: true,
        requiresImage: true,
      },
      {
        id: "ai_edit",
        label: "AI Remover",
        icon: <Paintbrush className="h-4 w-4" />,
        credits: 25,
        enabled: true,
        requiresImage: true,
      },
      // {
      //   id: "ai_background",
      //   label: "AI Background",
      //   icon: <ImagePlus className="h-4 w-4" />,
      //   credits: 25,
      //   enabled: true,
      //   requiresImage: true,
      // },
    ],
  },
  {
    label: "Generate",
    tools: [
      {
        id: "generate_flux",
        label: "FLUX Image",
        icon: <Wand2 className="h-4 w-4" />,
        credits: 15,
        enabled: true,
        requiresImage: false,
      },
      {
        id: "generate_gemini",
        label: "Gemini",
        icon: <BrainCircuit className="h-4 w-4" />,
        credits: 10,
        enabled: true,
        requiresImage: false,
      },
      {
        id: "generate_typography",
        label: "Typography",
        icon: <Type className="h-4 w-4" />,
        credits: 10,
        enabled: true,
        requiresImage: false,
      },
    ],
  },
  {
    label: "Enhance",
    tools: [
      // {
      //   id: "upscale",
      //   label: "Upscale",
      //   icon: <ZoomIn className="h-4 w-4" />,
      //   credits: 20,
      //   enabled: true,
      //   requiresImage: true,
      // },
      // {
      //   id: "relight",
      //   label: "Relight",
      //   icon: <Sun className="h-4 w-4" />,
      //   credits: 15,
      //   enabled: true,
      //   requiresImage: true,
      // },
      {
        id: "skin_enhance",
        label: "Skin",
        icon: <Sparkles className="h-4 w-4" />,
        credits: 20,
        enabled: true,
        requiresImage: true,
      },
    ],
  },
  {
    label: "AI Editing",
    tools: [
      {
        id: "gemini_ai_editor",
        label: "AI Editor",
        icon: <Wand2 className="h-4 w-4" />,
        credits: 15,
        enabled: true,
        requiresImage: true,
      },
      {
        id: "image_expand",
        label: "Expand",
        icon: <Maximize2 className="h-4 w-4" />,
        credits: 20,
        enabled: true,
        requiresImage: true,
      },
    ],
  },
  {
    label: "Utilities",
    tools: [
      {
        id: "color_picker",
        label: "Color Picker",
        icon: <Pipette className="h-4 w-4" />,
        credits: 0,
        enabled: true,
        requiresImage: true,
      },
      {
        id: "adjustments",
        label: "Adjustments",
        icon: <SlidersHorizontal className="h-4 w-4" />,
        credits: 0,
        enabled: true,
        requiresImage: true,
      },
    ],
  },
];

export function ToolSidebar() {
  const selectedTool = useStudioStore((s) => s.selectedTool);
  const setTool = useStudioStore((s) => s.setTool);
  const isProcessing = useStudioStore((s) => s.isProcessing);
  const activeImageId = useStudioStore((s) => s.activeImageId);

  const renderToolButton = (tool: ToolItem) => {
    const isDisabled = isProcessing || (tool.requiresImage && !activeImageId);
    const isActive = selectedTool === tool.id;

    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "group/tool relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all duration-300",
              isActive
                ? "bg-[#141517] text-primary shadow-[0_0_10px_0_rgba(0,0,0,0.5)]"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.06] active:scale-[0.98]",
              !isActive && !isDisabled && "hover:shadow-[0_0_8px_0_rgba(255,255,255,0.05)]",
              isDisabled && "opacity-30 pointer-events-none"
            )}
            disabled={isDisabled}
            onClick={() => setTool(selectedTool === tool.id ? null : tool.id)}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
            )}
            
            <span className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
              isActive 
                ? "bg-primary/20 text-primary scale-105" 
                : "bg-white/[0.06] group-hover/tool:bg-white/[0.1] group-hover/tool:scale-105"
            )}>
              {tool.icon}
            </span>
            <div className="hidden lg:flex flex-col min-w-0 flex-1">
              <span className={cn(
                "truncate text-[11.5px] font-semibold leading-tight transition-colors duration-300",
                isActive && "drop-shadow-sm"
              )}>
                {tool.label}
              </span>
              <span className={cn(
                "text-[10px] font-medium leading-tight transition-colors duration-300 tabular-nums",
                isActive ? "text-primary/70" : "text-white/30 group-hover/tool:text-white/40"
              )}>
                {tool.credits === 0 ? "Free" : `${tool.credits} cr`}
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-[#141517] backdrop-blur-2xl shadow-[0_0_10px_0_rgba(0,0,0,0.6)]"
        >
          <p className="text-xs font-semibold text-white">{tool.label}</p>
          <p className="text-xs text-white/50 mt-0.5">{tool.credits === 0 ? "Free tool" : `${tool.credits} credits`}</p>
          {tool.requiresImage && !activeImageId && (
            <p className="text-xs text-amber-400/70 mt-1 font-medium">Upload an image first</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="relative flex w-16 lg:w-[140px] xl:w-[168px] shrink-0 flex-col bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
        <div className="relative flex flex-col gap-1.5 overflow-y-auto px-2.5 py-4 scrollbar-none">
          {toolGroups.map((group, groupIndex) => (
            <div key={group.label} className="space-y-1">
              {groupIndex > 0 && (
                <div className="relative my-3 px-2">
                  <Separator className="bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                </div>
              )}
              <div className="px-2.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 drop-shadow-sm">
                  {group.label}
                </span>
              </div>
              <div className="space-y-1">
                {group.tools.map(renderToolButton)}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </TooltipProvider>
  );
}
