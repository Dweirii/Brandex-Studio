"use client";

import { useEffect, useCallback, useRef } from "react";
import { StudioHeader } from "@/components/studio/studio-header";
import { ToolSidebar } from "@/components/studio/tool-sidebar";
import { Canvas } from "@/components/studio/canvas";
import { UploadZone } from "@/components/studio/upload-zone";
import { ToolPanel } from "@/components/studio/tool-panel";
import { ImageGallery } from "@/components/studio/image-gallery";
import { ProjectBrowser } from "@/components/studio/project-browser";
import { ShortcutsModal } from "@/components/studio/shortcuts-modal";
import { ImageHistoryPanel } from "@/components/studio/image-history";
import { ComparisonView } from "@/components/studio/comparison-view";
import { BackgroundBeams } from "@/components/ui/beams";
import { useStudioStore } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { toast } from "sonner";

export default function StudioPage() {
  const { studioRequest, studioUpload } = useStudioApi();
  const {
    view,
    projectId,
    images,
    isProcessing,
    showHistory,
    showComparison,
    activeImageId,
    setProjects,
    setLoadingProjects,
    addImage,
    setProcessing,
    setShowHistory,
  } = useStudioStore();

  // Track object URLs for cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const data = await studioRequest<
          Array<{
            id: string;
            name: string;
            imageCount: number;
            thumbnail: string | null;
            createdAt: string;
            updatedAt: string;
          }>
        >("/projects");
        if (!cancelled) {
          setProjects(data);
        }
      } catch (error) {
        console.error("[Studio] Failed to load projects:", error);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [studioRequest, setProjects, setLoadingProjects]);

  // Handle image upload — sends file to server
  const handleUpload = useCallback(
    async (file: File) => {
      if (!projectId) {
        toast.error("Project not initialized. Please refresh the page.");
        return;
      }

      setProcessing(true, "Uploading image...");

      try {
        const formData = new FormData();
        formData.append("image", file, file.name);
        formData.append("projectId", projectId);

        const result = await studioUpload<{
          id: string;
          url: string;
          type: string;
          creditsCost: number;
          fileFormat?: string | null;
          fileSize?: number | null;
          width?: number | null;
          height?: number | null;
        }>("/upload", formData);

        addImage({
          id: result.id,
          type: result.type || "original",
          url: result.url,
          creditsCost: result.creditsCost || 0,
          createdAt: new Date().toISOString(),
          fileFormat: result.fileFormat,
          fileSize: result.fileSize,
          width: result.width,
          height: result.height,
        });

        toast.success("Image uploaded! Select a tool to get started.");
      } catch (error) {
        console.error("[Upload] Error:", error);
        
        // Fallback: if server upload endpoint doesn't exist yet, use local preview
        // This ensures the app still works while the upload endpoint is being built
        try {
          const localUrl = URL.createObjectURL(file);
          objectUrlsRef.current.add(localUrl);
          addImage({
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: "original",
            url: localUrl,
            creditsCost: 0,
            createdAt: new Date().toISOString(),
          });
          toast.success("Image loaded locally. Select a tool to get started.");
        } catch (fallbackError) {
          toast.error("Failed to upload image. Please try again.");
        }
      } finally {
        setProcessing(false);
      }
    },
    [projectId, addImage, setProcessing, studioUpload]
  );

  // Show project browser when in browser mode
  if (view === "browser") {
    return <ProjectBrowser />;
  }

  // Workspace mode
  return (
    <div className="flex h-screen flex-col bg-black relative overflow-hidden">
      {/* Animated background beams */}
      <BackgroundBeams className="opacity-30" />
      
      <StudioHeader />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <ToolSidebar />

        <div className="flex flex-1 flex-col relative z-10">
          {/* Keyboard Shortcuts Modal */}
          <ShortcutsModal />
          
          {/* Show comparison view if enabled */}
          {showComparison && images.length > 0 ? (
            <ComparisonView />
          ) : isProcessing ? (
            <Canvas />
          ) : images.length === 0 ? (
            <div className="relative flex flex-1 items-center justify-center p-12">
              <div className="w-full max-w-3xl">
                <div className="mb-12 text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-2xl">
                    Start Creating
                  </h1>
                  <p className="text-sm md:text-base text-white/50 max-w-md mx-auto leading-relaxed">
                    Upload an image to enhance it, or use a generation tool from the sidebar
                  </p>
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <UploadZone
                    onUpload={handleUpload}
                    isDisabled={isProcessing || !projectId}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Canvas />
          )}

          <ImageGallery onUpload={handleUpload} />
        </div>

        {/* History Panel */}
        {showHistory && activeImageId && (
          <ImageHistoryPanel
            imageId={activeImageId}
            onClose={() => setShowHistory(false)}
          />
        )}

        <ToolPanel />
      </div>
    </div>
  );
}
