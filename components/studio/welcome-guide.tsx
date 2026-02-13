"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Eraser,
  Wand2,
  ZoomIn,
  Sparkles,
  Type,
  BrainCircuit,
  Pipette,
  SlidersHorizontal,
  Upload,
  MousePointerClick,
  Download,
  ArrowRight,
  Coins,
  Keyboard,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Layers,
  Paintbrush,
  Star,
  GitCompare,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "brandex-guide-seen";

// ── Guide Pages ──────────────────────────────────────────────────────────────

interface GuidePageProps {
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  currentPage: number;
  totalPages: number;
}

function WelcomePage({ onNext }: GuidePageProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Hero logo */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 shadow-[0_0_40px_0_rgba(0,235,2,0.15)]">
          <img
            src="/icon.png"
            alt="Brandex"
            className="h-12 w-12 object-contain"
            draggable={false}
          />
        </div>
        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-black shadow-lg">
          AI
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        Welcome to Brandex Studio
      </h2>
      <p className="text-sm text-white/50 max-w-sm mb-8 leading-relaxed">
        Your AI-powered creative suite for product photography. Remove
        backgrounds, generate stunning scenes, upscale images, and more —
        all in one place.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-3 w-full mb-8">
        {[
          { icon: Wand2, label: "AI Generation", sub: "Create from text" },
          { icon: Eraser, label: "Background", sub: "Remove & replace" },
          { icon: ZoomIn, label: "Enhancement", sub: "Upscale & refine" },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
              <Icon className="h-5 w-5 text-primary/80" />
            </div>
            <span className="text-xs font-semibold text-white/80">{label}</span>
            <span className="text-[10px] text-white/40">{sub}</span>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Get Started
      </Button>
    </div>
  );
}

function WorkflowPage(_props: GuidePageProps) {
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Image",
      description:
        "Drag and drop or click to upload a PNG, JPEG, or WebP image (up to 10 MB). You can also generate images from text prompts.",
    },
    {
      icon: MousePointerClick,
      title: "Choose a Tool",
      description:
        "Pick from AI tools in the left sidebar — remove backgrounds, generate new scenes, upscale, enhance skin, and more.",
    },
    {
      icon: Layers,
      title: "Edit Non-Destructively",
      description:
        "Every edit creates a new version. Your original is always safe. Compare versions side-by-side anytime.",
    },
    {
      icon: Download,
      title: "Export & Download",
      description:
        "Export in multiple formats and sizes using presets. Download individual images or batch-download as a ZIP.",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">How It Works</h2>
        <p className="text-sm text-white/40">
          Four simple steps from upload to export.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="group flex items-start gap-4 rounded-xl bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
          >
            {/* Step number + icon */}
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 transition-colors group-hover:bg-primary/20">
                <step.icon className="h-5 w-5 text-primary/80" />
              </div>
              <div className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-black">
                {index + 1}
              </div>
            </div>

            {/* Text */}
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-semibold text-white/90 mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolsPage(_props: GuidePageProps) {
  const toolGroups = [
    {
      label: "Background & Edit",
      tools: [
        {
          icon: Eraser,
          name: "Remove BG",
          desc: "Instant transparent PNG",
          credits: 5,
        },
        {
          icon: Paintbrush,
          name: "AI Edit",
          desc: "Select, recolor, or remove anything",
          credits: 25,
        },
      ],
    },
    {
      label: "Generate",
      tools: [
        {
          icon: Wand2,
          name: "FLUX Image",
          desc: "Ultra-quality AI generation",
          credits: 15,
        },
        {
          icon: BrainCircuit,
          name: "Gemini",
          desc: "Google AI image generation",
          credits: 10,
        },
        {
          icon: Type,
          name: "Typography",
          desc: "Perfect text & logos",
          credits: 10,
        },
      ],
    },
    {
      label: "Enhance",
      tools: [
        {
          icon: ZoomIn,
          name: "Upscale",
          desc: "AI upscale up to 4x",
          credits: 20,
        },
        {
          icon: Sparkles,
          name: "Skin Enhance",
          desc: "Professional retouching",
          credits: 20,
        },
      ],
    },
    {
      label: "Utilities (Free)",
      tools: [
        {
          icon: Pipette,
          name: "Color Picker",
          desc: "Sample & extract palettes",
          credits: 0,
        },
        {
          icon: SlidersHorizontal,
          name: "Adjustments",
          desc: "Brightness, contrast, etc.",
          credits: 0,
        },
      ],
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Your Tools</h2>
        <p className="text-sm text-white/40">
          Everything you need, organized by category.
        </p>
      </div>

      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {toolGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">
              {group.label}
            </div>
            <div className="space-y-1.5">
              {group.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                    <tool.icon className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white/80">
                      {tool.name}
                    </span>
                    <p className="text-[10px] text-white/35">{tool.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tool.credits > 0 ? (
                      <>
                        <Coins className="h-3 w-3 text-amber-400/70" />
                        <span className="text-[10px] font-semibold text-white/40 tabular-nums">
                          {tool.credits}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-primary/60">
                        Free
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsPage({ onFinish }: GuidePageProps) {
  const tips = [
    {
      icon: Keyboard,
      title: "Keyboard Shortcuts",
      description:
        'Press ? anytime to see all shortcuts. Use arrow keys to navigate images, F for fullscreen, and D to download.',
    },
    {
      icon: GitCompare,
      title: "Compare Versions",
      description:
        "Press C to compare your edited image with the original using an interactive slider.",
    },
    {
      icon: History,
      title: "Version History",
      description:
        "Press H to see the full edit history tree. Every operation is saved — go back to any version.",
    },
    {
      icon: Star,
      title: "Favorites & Batch",
      description:
        "Star your best images with S. Right-click to select multiple images for batch download or delete.",
    },
    {
      icon: ImageIcon,
      title: "Non-Destructive Edits",
      description:
        "Every tool creates a new image. Your original is always preserved — experiment freely.",
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Pro Tips</h2>
        <p className="text-sm text-white/40">
          Get the most out of Brandex Studio.
        </p>
      </div>

      <div className="space-y-2.5 mb-6 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {tips.map((tip) => (
          <div
            key={tip.title}
            className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.05]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] mt-0.5">
              <tip.icon className="h-4 w-4 text-primary/70" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-white/80 mb-0.5">
                {tip.title}
              </h3>
              <p className="text-[11px] text-white/40 leading-relaxed">
                {tip.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onFinish} className="w-full" size="lg">
        Start Creating
      </Button>
    </div>
  );
}

// ── Page registry ────────────────────────────────────────────────────────────

const PAGES = [WelcomePage, WorkflowPage, ToolsPage, TipsPage] as const;
const PAGE_LABELS = ["Welcome", "Workflow", "Tools", "Tips"];

// ── Main Component ───────────────────────────────────────────────────────────

interface WelcomeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeGuide({ open, onOpenChange }: WelcomeGuideProps) {
  const [page, setPage] = useState(0);

  // Reset to first page when opening
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNext = useCallback(() => {
    setPage((p) => Math.min(p + 1, PAGES.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(p - 1, 0));
  }, []);

  const PageComponent = PAGES[page];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Accessible but visually hidden title */}
        <DialogTitle className="sr-only">Welcome Guide</DialogTitle>
        <DialogDescription className="sr-only">
          A guided tour of Brandex Studio features and tools
        </DialogDescription>

        {/* Content area */}
        <div className="px-6 pt-8 pb-6">
          <PageComponent
            onNext={handleNext}
            onPrev={handlePrev}
            onFinish={handleFinish}
            currentPage={page}
            totalPages={PAGES.length}
          />
        </div>

        {/* Footer: Navigation */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4 bg-white/[0.02]">
          {/* Prev button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={page === 0}
            className={cn(
              "text-white/40 hover:text-white transition-all",
              page === 0 && "invisible"
            )}
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>

          {/* Page indicators */}
          <div className="flex items-center gap-3">
            {PAGE_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => setPage(index)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === page
                      ? "w-6 bg-primary"
                      : index < page
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-white/15 group-hover:bg-white/30"
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-medium transition-colors",
                    index === page
                      ? "text-white/60"
                      : "text-white/20 group-hover:text-white/40"
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Next / Skip */}
          {page < PAGES.length - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="text-white/40 hover:text-white transition-all"
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFinish}
              className="text-white/40 hover:text-white transition-all"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helper: check if guide has been seen ──────────────────────────────────────

export function useWelcomeGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Small delay so the main UI renders first
        const timer = setTimeout(() => setShowGuide(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const openGuide = useCallback(() => setShowGuide(true), []);
  const closeGuide = useCallback(() => setShowGuide(false), []);

  return { showGuide, setShowGuide, openGuide, closeGuide };
}
