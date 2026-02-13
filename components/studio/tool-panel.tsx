"use client";

import { useStudioStore } from "@/stores/use-studio-store";
import { RemoveBgPanel } from "./tool-panels/remove-bg-panel";
import { AiBackgroundPanel } from "./tool-panels/ai-background-panel";
import { GenerateFluxPanel } from "./tool-panels/generate-flux-panel";
import { GenerateGeminiPanel } from "./tool-panels/generate-gemini-panel";
import { GenerateTypographyPanel } from "./tool-panels/generate-typography-panel";
import { UpscalePanel } from "./tool-panels/upscale-panel";
import { RelightPanel } from "./tool-panels/relight-panel";
import { SkinEnhancePanel } from "./tool-panels/skin-enhance-panel";
import { ColorPickerPanel } from "./tool-panels/color-picker-panel";
import { AdjustmentsPanel } from "./tool-panels/adjustments-panel";
import { AiEditPanel } from "./tool-panels/ai-edit-panel";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function ToolPanel() {
  const selectedTool = useStudioStore((s) => s.selectedTool);
  const setTool = useStudioStore((s) => s.setTool);

  // Close panel with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTool) {
        e.preventDefault();
        setTool(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTool, setTool]);

  if (!selectedTool) return null;

  return (
    <div className="relative w-64 lg:w-72 xl:w-80 shrink-0 bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] animate-in slide-in-from-right-5 duration-300">
        <div className="relative flex items-center justify-between px-5 py-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/40">
            Options
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] text-white/30">ESC</kbd>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:rotate-90"
          onClick={() => setTool(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative p-3 lg:p-4 xl:p-5 overflow-y-auto max-h-[calc(100vh-10rem)] scrollbar-thin">
        {selectedTool === "remove_bg" && <RemoveBgPanel />}
        {selectedTool === "ai_edit" && <AiEditPanel />}
        {selectedTool === "ai_background" && <AiBackgroundPanel />}
        {selectedTool === "generate_flux" && <GenerateFluxPanel />}
        {selectedTool === "generate_gemini" && <GenerateGeminiPanel />}
        {selectedTool === "generate_typography" && <GenerateTypographyPanel />}
        {selectedTool === "upscale" && <UpscalePanel />}
        {selectedTool === "relight" && <RelightPanel />}
        {selectedTool === "skin_enhance" && <SkinEnhancePanel />}
        {selectedTool === "color_picker" && <ColorPickerPanel />}
        {selectedTool === "adjustments" && <AdjustmentsPanel />}
      </div>
    </div>
  );
}
