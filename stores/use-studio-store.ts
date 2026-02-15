"use client";

import { create } from "zustand";

export interface StudioImage {
  id: string;
  type: string;
  url: string;
  prompt?: string | null;
  provider?: string | null;
  operation?: string | null;
  parentId?: string | null;
  creditsCost: number;
  createdAt: string;
  /** User-assigned display name (null = use auto-generated). */
  name?: string | null;
  // Designer features metadata
  isFavorite?: boolean;
  fileFormat?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  colorSpace?: string | null;
  processingTime?: number | null;
}

export interface StudioProject {
  id: string;
  name: string;
  imageCount: number;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Tool =
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
  | "gemini_ai_editor"
  | null;

type ViewMode = "browser" | "workspace";
export type CanvasBackground = "transparent" | "white" | "black" | "dark";
export type GridOverlay = "none" | "thirds" | "center" | "golden";

interface StudioState {
  // View mode
  view: ViewMode;

  // Project browsing
  projects: StudioProject[];
  isLoadingProjects: boolean;

  // Active project
  projectId: string | null;
  projectName: string;

  // Images
  images: StudioImage[];
  activeImageId: string | null;

  // UI state
  selectedTool: Tool;
  isProcessing: boolean;
  processingMessage: string;
  processingTool: Tool;
  processingStartTime: number | null;
  processingPrompt: string;
  canvasBackground: CanvasBackground;
  gridOverlay: GridOverlay;
  showHistory: boolean;
  showComparison: boolean;

  // View actions
  setView: (view: ViewMode) => void;
  setProjects: (projects: StudioProject[]) => void;
  addProject: (project: StudioProject) => void;
  setLoadingProjects: (loading: boolean) => void;

  // Project actions
  openProject: (id: string, name: string, images: StudioImage[]) => void;
  closeProject: () => void;
  setProject: (id: string, name: string) => void;
  renameProject: (id: string, name: string) => void;
  removeProject: (id: string) => void;

  // Image actions
  setImages: (images: StudioImage[]) => void;
  addImage: (image: StudioImage) => void;
  removeImage: (id: string) => void;
  setActiveImage: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
  renameImage: (id: string, name: string) => void;

  // UI actions
  setTool: (tool: Tool) => void;
  setProcessing: (processing: boolean, message?: string, tool?: Tool, prompt?: string) => void;
  setCanvasBackground: (bg: CanvasBackground) => void;
  setGridOverlay: (grid: GridOverlay) => void;
  setShowHistory: (show: boolean) => void;
  setShowComparison: (show: boolean) => void;
  reset: () => void;
}

const initialState = {
  view: "browser" as ViewMode,
  projects: [] as StudioProject[],
  isLoadingProjects: false,
  projectId: null as string | null,
  projectName: "Untitled Project",
  images: [] as StudioImage[],
  activeImageId: null as string | null,
  selectedTool: null as Tool,
  isProcessing: false,
  processingMessage: "",
  processingTool: null as Tool,
  processingStartTime: null as number | null,
  processingPrompt: "",
  canvasBackground: "transparent" as CanvasBackground,
  gridOverlay: "none" as GridOverlay,
  showHistory: false,
  showComparison: false,
};

export const useStudioStore = create<StudioState>((set) => ({
  ...initialState,

  // View
  setView: (view) => set({ view }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),
  setLoadingProjects: (loading) => set({ isLoadingProjects: loading }),

  // Open a project and load its images into the workspace
  openProject: (id, name, images) =>
    set({
      view: "workspace",
      projectId: id,
      projectName: name,
      images,
      activeImageId: images.length > 0 ? images[images.length - 1].id : null,
      selectedTool: null,
    }),

  // Go back to the project browser — reset all workspace state via initialState
  closeProject: () =>
    set({
      ...initialState,
      // Preserve projects list since we don't want to refetch
      projects: useStudioStore.getState().projects,
    }),

  setProject: (id, name) => set({ projectId: id, projectName: name }),

  renameProject: (id, name) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)),
      projectName: state.projectId === id ? name : state.projectName,
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),

  // Preserve activeImageId if it still exists in the new array
  setImages: (images) =>
    set((state) => {
      const currentStillExists = images.some((img) => img.id === state.activeImageId);
      return {
        images,
        activeImageId: currentStillExists
          ? state.activeImageId
          : images.length > 0
          ? images[images.length - 1].id
          : null,
      };
    }),

  // Deduplicate by ID before adding
  addImage: (image) =>
    set((state) => {
      const exists = state.images.some((img) => img.id === image.id);
      if (exists) {
        return { activeImageId: image.id };
      }
      return {
        images: [...state.images, image],
        activeImageId: image.id,
      };
    }),

  removeImage: (id) =>
    set((state) => {
      const filtered = state.images.filter((img) => img.id !== id);
      let nextActiveId = state.activeImageId;

      // If the removed image was active, pick a new active image
      if (state.activeImageId === id) {
        const removedIndex = state.images.findIndex((img) => img.id === id);
        if (filtered.length === 0) {
          nextActiveId = null;
        } else if (removedIndex >= filtered.length) {
          nextActiveId = filtered[filtered.length - 1].id;
        } else {
          nextActiveId = filtered[removedIndex].id;
        }
      }

      return { images: filtered, activeImageId: nextActiveId };
    }),

  setActiveImage: (id) => set({ activeImageId: id }),

  toggleFavorite: (id) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
      ),
    })),

  renameImage: (id, name) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, name: name || null } : img
      ),
    })),

  setTool: (tool) => set({ selectedTool: tool }),

  setProcessing: (processing, message = "", tool = null, prompt = "") =>
    set({
      isProcessing: processing,
      processingMessage: message,
      processingTool: processing ? tool : null,
      processingStartTime: processing ? Date.now() : null,
      processingPrompt: processing ? prompt : "",
    }),

  setCanvasBackground: (bg) => set({ canvasBackground: bg }),

  setGridOverlay: (grid) => set({ gridOverlay: grid }),

  setShowHistory: (show) => set({ showHistory: show }),

  setShowComparison: (show) => set({ showComparison: show }),

  reset: () => set(initialState),
}));
