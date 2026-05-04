"use client";

import {
  Eraser,
  Wand2,
  Sparkles,
  Type,
  BrainCircuit,
  Pipette,
  SlidersHorizontal,
  Maximize2,
} from "lucide-react";
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
              "group/tool relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
              isActive
                ? "bg-white/[0.06] text-white"
                : "text-white/55 hover:text-white hover:bg-white/[0.04]",
              isDisabled && "opacity-30 pointer-events-none"
            )}
            disabled={isDisabled}
            onClick={() => setTool(selectedTool === tool.id ? null : tool.id)}
          >
            {/* Active accent bar */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
            )}

            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                isActive
                  ? "text-primary"
                  : "text-white/50 group-hover/tool:text-white/80"
              )}
            >
              {tool.icon}
            </span>
            <div className="hidden lg:flex flex-col min-w-0 flex-1">
              <span className="truncate text-[12px] font-medium leading-tight">
                {tool.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-tight tabular-nums transition-colors",
                  isActive ? "text-white/45" : "text-white/30"
                )}
              >
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
      <aside className="relative flex w-16 lg:w-[148px] xl:w-[176px] shrink-0 flex-col bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)]">
        <div className="relative flex flex-col overflow-y-auto px-2 py-4 scrollbar-none">
          {toolGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
              <div className="px-3 pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.tools.map(renderToolButton)}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </TooltipProvider>
  );
}
