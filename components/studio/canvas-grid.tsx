/**
 * Canvas Grid Overlay
 * Provides professional grid overlays for image composition
 */

"use client";

import { cn } from "@/lib/utils";

export type GridType = "none" | "thirds" | "center" | "golden";

interface CanvasGridProps {
  type: GridType;
  className?: string;
}

export function CanvasGrid({ type, className }: CanvasGridProps) {
  if (type === "none") return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none z-20", className)}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {type === "thirds" && <RuleOfThirdsGrid />}
        {type === "center" && <CenterGuides />}
        {type === "golden" && <GoldenRatioGrid />}
      </svg>
    </div>
  );
}

// Rule of Thirds Grid (3x3)
function RuleOfThirdsGrid() {
  return (
    <g stroke="rgba(0, 235, 2, 0.5)" strokeWidth="1" fill="none">
      {/* Vertical lines */}
      <line x1="33.33%" y1="0%" x2="33.33%" y2="100%" />
      <line x1="66.66%" y1="0%" x2="66.66%" y2="100%" />
      {/* Horizontal lines */}
      <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" />
      <line x1="0%" y1="66.66%" x2="100%" y2="66.66%" />
      {/* Intersection points */}
      <circle cx="33.33%" cy="33.33%" r="4" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx="66.66%" cy="33.33%" r="4" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx="33.33%" cy="66.66%" r="4" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx="66.66%" cy="66.66%" r="4" fill="rgba(0, 235, 2, 0.7)" />
    </g>
  );
}

// Center Crosshair Guides
function CenterGuides() {
  return (
    <g stroke="rgba(0, 235, 2, 0.6)" strokeWidth="1" fill="none">
      {/* Vertical center line */}
      <line x1="50%" y1="0%" x2="50%" y2="100%" strokeDasharray="8,4" />
      {/* Horizontal center line */}
      <line x1="0%" y1="50%" x2="100%" y2="50%" strokeDasharray="8,4" />
      {/* Center point */}
      <circle cx="50%" cy="50%" r="6" stroke="rgba(0, 235, 2, 0.8)" strokeWidth="2" />
      <circle cx="50%" cy="50%" r="3" fill="rgba(0, 235, 2, 0.5)" />
    </g>
  );
}

// Golden Ratio Grid (1.618:1)
function GoldenRatioGrid() {
  const ratio = 1.618;
  const vertical1 = (1 / (1 + ratio)) * 100; // ~38.2%
  const vertical2 = 100 - vertical1; // ~61.8%

  return (
    <g stroke="rgba(0, 235, 2, 0.5)" strokeWidth="1" fill="none">
      {/* Vertical lines at golden ratio */}
      <line x1={`${vertical1}%`} y1="0%" x2={`${vertical1}%`} y2="100%" />
      <line x1={`${vertical2}%`} y1="0%" x2={`${vertical2}%`} y2="100%" />
      {/* Horizontal lines at golden ratio */}
      <line x1="0%" y1={`${vertical1}%`} x2="100%" y2={`${vertical1}%`} />
      <line x1="0%" y1={`${vertical2}%`} x2="100%" y2={`${vertical2}%`} />
      {/* Intersection points */}
      <circle cx={`${vertical1}%`} cy={`${vertical1}%`} r="3" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx={`${vertical2}%`} cy={`${vertical1}%`} r="3" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx={`${vertical1}%`} cy={`${vertical2}%`} r="3" fill="rgba(0, 235, 2, 0.7)" />
      <circle cx={`${vertical2}%`} cy={`${vertical2}%`} r="3" fill="rgba(0, 235, 2, 0.7)" />
      {/* Optional: Add phi spiral guide hint */}
      <text
        x="10"
        y="20"
        fill="rgba(0, 235, 2, 0.4)"
        fontSize="10"
        fontFamily="monospace"
      >
        φ 1.618
      </text>
    </g>
  );
}
