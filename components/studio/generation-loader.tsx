"use client";

import { useEffect, useState, useMemo } from "react";
import { useStudioStore, type Tool } from "@/stores/use-studio-store";
import { cn } from "@/lib/utils";

// ─── Provider configuration ────────────────────────────────────────
interface ProviderConfig {
  name: string;
  subtitle: string;
  gradient: string;
  glowColor: string;
  orbColors: [string, string, string];
  estimatedSeconds: number;
  tips: string[];
}

const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  generate_flux: {
    name: "FLUX Ultra",
    subtitle: "Replicate · FLUX 1.1 Pro Ultra",
    gradient: "from-primary/90 via-primary to-emerald-400",
    glowColor: "shadow-primary/25",
    orbColors: ["bg-primary", "bg-emerald-400", "bg-primary/70"],
    estimatedSeconds: 30,
    tips: [
      "FLUX Ultra excels at photorealistic compositions",
      "Raw mode produces more natural, film-like results",
      "Ultra resolution outputs at native 4MP+",
    ],
  },
  generate_gemini: {
    name: "Gemini",
    subtitle: "Google · Gemini Image Generation",
    gradient: "from-primary/90 via-primary to-emerald-400",
    glowColor: "shadow-primary/25",
    orbColors: ["bg-primary", "bg-emerald-400", "bg-primary/70"],
    estimatedSeconds: 20,
    tips: [
      "Gemini understands complex spatial relationships",
      "Use negative prompts to refine your results",
      "HD mode generates at 4K resolution",
    ],
  },
  generate_typography: {
    name: "Typography",
    subtitle: "Ideogram · v3 Quality",
    gradient: "from-primary/90 via-primary to-emerald-400",
    glowColor: "shadow-primary/25",
    orbColors: ["bg-primary", "bg-emerald-400", "bg-primary/70"],
    estimatedSeconds: 25,
    tips: [
      "Ideogram excels at rendering readable text in images",
      "Be specific about font styles for best results",
      "Design mode is optimized for logos and branding",
    ],
  },
};

const DEFAULT_CONFIG: ProviderConfig = {
  name: "AI",
  subtitle: "Processing your request",
  gradient: "from-primary/90 via-primary to-emerald-400",
  glowColor: "shadow-primary/25",
  orbColors: ["bg-primary", "bg-emerald-400", "bg-primary/70"],
  estimatedSeconds: 30,
  tips: ["Your image is being generated..."],
};

// ─── Sub-components ────────────────────────────────────────────────

/** Animated orbs that orbit around a center point */
function OrbitingOrbs({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0">
      {colors.map((color, i) => (
        <div
          key={i}
          className={cn(
            "absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full blur-[1px]",
            color
          )}
          style={{
            animation: `orbit ${3 + i * 0.8}s linear infinite`,
            animationDelay: `${i * -1}s`,
            transformOrigin: "0 0",
          }}
        />
      ))}
    </div>
  );
}

/** Elapsed time counter */
function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="font-mono text-xs tabular-nums text-white/50">
      {minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, "0")}`
        : `${seconds}s`}
    </span>
  );
}

/** Indeterminate progress bar with shimmer */
function ShimmerProgress({ gradient }: { gradient: string }) {
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={cn(
          "absolute inset-y-0 w-2/3 rounded-full bg-gradient-to-r opacity-80",
          gradient
        )}
        style={{
          animation: "shimmerSlide 2s ease-in-out infinite",
        }}
      />
      {/* Glow layer */}
      <div
        className={cn(
          "absolute inset-y-0 w-2/3 rounded-full bg-gradient-to-r opacity-30 blur-sm",
          gradient
        )}
        style={{
          animation: "shimmerSlide 2s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/** Rotating tips display */
function RotatingTips({ tips }: { tips: string[] }) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (tips.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % tips.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <p
      className={cn(
        "text-[11px] text-white/30 text-center max-w-[280px] leading-relaxed transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      {tips[index]}
    </p>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function GenerationLoader() {
  const processingTool = useStudioStore((s) => s.processingTool);
  const processingMessage = useStudioStore((s) => s.processingMessage);
  const processingStartTime = useStudioStore((s) => s.processingStartTime);
  const processingPrompt = useStudioStore((s) => s.processingPrompt);

  const config = useMemo(() => {
    if (processingTool && PROVIDER_CONFIG[processingTool]) {
      return PROVIDER_CONFIG[processingTool];
    }
    return DEFAULT_CONFIG;
  }, [processingTool]);

  const truncatedPrompt = useMemo(() => {
    if (!processingPrompt) return null;
    return processingPrompt.length > 80
      ? processingPrompt.slice(0, 80) + "..."
      : processingPrompt;
  }, [processingPrompt]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0 animate-in fade-in duration-700">
      {/* ── Central animation ── */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute h-32 w-32 rounded-full opacity-[0.08] blur-2xl bg-gradient-to-br",
            config.gradient
          )}
          style={{ animation: "pulseGlow 3s ease-in-out infinite" }}
        />

        {/* Ring track */}
        <div className="absolute h-24 w-24 rounded-full border border-white/[0.06]" />

        {/* Spinning gradient ring */}
        <div
          className="absolute h-24 w-24 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, transparent 60%, var(--ring-color) 100%)`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px))",
            // @ts-expect-error CSS custom property
            "--ring-color": "rgba(0,235,2,0.4)",
            animation: "loaderSpin 2.5s linear infinite",
          }}
        />

        {/* Orbiting particles */}
        <OrbitingOrbs colors={config.orbColors} />

        {/* Center icon container */}
        <div
          className={cn(
            "relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#141517]/90 backdrop-blur-xl",
            `shadow-lg ${config.glowColor}`
          )}
        >
          <img
            src="/icon.png"
            alt="Brandex"
            className="h-7 w-7 object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Provider info ── */}
      <div className="flex flex-col items-center gap-1.5 mb-5">
        <h3 className="text-sm font-semibold text-white/90 tracking-wide">
          {config.name}
        </h3>
        <p className="text-[11px] font-medium text-white/35">{config.subtitle}</p>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-56 mb-5">
        <ShimmerProgress gradient={config.gradient} />
      </div>

      {/* ── Status row ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <div className="relative h-1.5 w-1.5">
            <div className={cn("absolute inset-0 rounded-full bg-gradient-to-r animate-pulse", config.gradient)} />
            <div className={cn("absolute inset-0 rounded-full bg-gradient-to-r blur-sm opacity-60", config.gradient)} />
          </div>
          <span className="text-xs font-medium text-white/50">
            {processingMessage || "Generating..."}
          </span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        {processingStartTime && <ElapsedTimer startTime={processingStartTime} />}
      </div>

      {/* ── Prompt preview ── */}
      {truncatedPrompt && (
        <div className="mb-6 max-w-xs rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 backdrop-blur-sm">
          <p className="text-[11px] leading-relaxed text-white/30 italic text-center">
            &ldquo;{truncatedPrompt}&rdquo;
          </p>
        </div>
      )}

      {/* ── Rotating tip ── */}
      <RotatingTips tips={config.tips} />

      {/* ── Keyframe styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(46px) rotate(0deg) translate(-50%, -50%); }
          100% { transform: rotate(360deg) translateX(46px) rotate(-360deg) translate(-50%, -50%); }
        }
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.15); }
        }
        @keyframes loaderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
