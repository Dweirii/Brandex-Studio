/**
 * Centralized Keyboard Shortcuts Configuration
 */

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: "← →",
    description: "Navigate between images",
    category: "Navigation",
  },
  {
    key: "ESC",
    description: "Close panels / Exit fullscreen",
    category: "Navigation",
  },

  // View Controls
  {
    key: "F",
    description: "Toggle fullscreen mode",
    category: "View",
  },
  {
    key: "G",
    description: "Cycle grid overlays",
    category: "View",
  },
  {
    key: "I",
    description: "Toggle image info",
    category: "View",
  },
  {
    key: "C",
    description: "Toggle comparison mode",
    category: "View",
  },
  {
    key: "H",
    description: "Show version history",
    category: "View",
  },

  // Zoom Controls
  {
    key: "Scroll",
    description: "Zoom in/out",
    category: "Zoom",
  },
  {
    key: "+",
    description: "Zoom in",
    category: "Zoom",
  },
  {
    key: "-",
    description: "Zoom out",
    category: "Zoom",
  },
  {
    key: "0",
    description: "Reset zoom to 100%",
    category: "Zoom",
  },

  // Actions
  {
    key: "S",
    description: "Star/unstar active image",
    category: "Actions",
  },
  {
    key: "P",
    description: "Toggle color picker",
    category: "Actions",
  },
  {
    key: "A",
    description: "Toggle quick adjustments",
    category: "Actions",
  },
  {
    key: "D",
    description: "Download active image",
    category: "Actions",
  },
  {
    key: "?",
    description: "Show this help menu",
    category: "Help",
  },
];

export const SHORTCUT_CATEGORIES = [
  "Navigation",
  "View",
  "Zoom",
  "Actions",
  "Help",
] as const;
