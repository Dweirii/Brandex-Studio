"use client";

import { useState } from "react";
import { useStudioStore, type StudioProject, type StudioImage } from "@/stores/use-studio-store";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioLogo } from "./studio-logo";
import { UserButton } from "@clerk/nextjs";
import {
  Plus,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Check,
  X,
  Coins,
  Clock,
  Sparkles,
} from "lucide-react";
import { BackgroundBeams } from "@/components/ui/beams";
import { handleError } from "@/lib/error-handler";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ProjectCard({
  project,
  onOpen,
  onRename,
  onDelete,
}: {
  project: StudioProject;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== project.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-[#141517] transition-all duration-500",
        "shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:shadow-[0_0_12px_0_rgba(255,255,255,0.15)] hover:scale-[1.02]",
        "cursor-pointer"
      )}
      onClick={() => !isEditing && !isDeleting && onOpen()}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FolderOpen className="h-12 w-12 text-white/[0.1] transition-all duration-500 group-hover:scale-110 group-hover:text-white/[0.15]" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-all duration-500 group-hover:bg-black/80 group-hover:opacity-100">
          <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            <Button
              size="sm"
              className="h-10 gap-2 bg-primary text-black hover:bg-primary/90 font-semibold shadow-[0_0_10px_0_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              <FolderOpen className="h-4 w-4" />
              Open
            </Button>
          </div>
        </div>

        {/* Image count badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-xl px-2.5 py-1.5 transition-all duration-300 group-hover:bg-black/80">
          <ImageIcon className="h-3 w-3 text-white/60" />
          <span className="text-[10px] font-semibold text-white/70 tabular-nums">
            {project.imageCount}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        {isEditing ? (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm bg-white/[0.08] border-white/[0.15] focus:border-primary/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleSaveRename}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="truncate text-sm font-semibold text-white/90 transition-colors duration-300 group-hover:text-white">
              {project.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(project.name);
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg text-white/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40 transition-colors duration-300 group-hover:text-white/50">
          <Clock className="h-3 w-3" />
          {formatDate(project.updatedAt)}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {isDeleting && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-white/80">Delete project?</p>
          <p className="text-xs text-white/40 px-4 text-center">
            This cannot be undone
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-white/60 hover:text-white"
              onClick={() => setIsDeleting(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 bg-destructive text-white hover:bg-destructive/80"
              onClick={() => {
                onDelete();
                setIsDeleting(false);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectBrowser() {
  const { studioRequest } = useStudioApi();
  const { balance, isLoading: isLoadingCredits } = useCredits();
  const {
    projects,
    isLoadingProjects,
    setProjects,
    openProject,
    renameProject,
    removeProject,
    setLoadingProjects,
  } = useStudioStore();

  const [isCreating, setIsCreating] = useState(false);

  // Create new project
  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const project = await studioRequest<StudioProject>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: `Project ${new Date().toLocaleDateString()}` }),
      });
      // Open the new empty project directly
      openProject(project.id, project.name, []);
      toast.success("Project created!");
    } catch (error) {
      handleError(error, { operation: "create project" });
    } finally {
      setIsCreating(false);
    }
  };

  // Open existing project — fetch its images
  const handleOpenProject = async (project: StudioProject) => {
    setLoadingProjects(true);
    try {
      const data = await studioRequest<{
        id: string;
        name: string;
        images: StudioImage[];
      }>(`/projects/${project.id}`);
      openProject(data.id, data.name, data.images || []);
    } catch (error) {
      handleError(error, { operation: "open project" });
    } finally {
      setLoadingProjects(false);
    }
  };

  // Rename project — with rollback on failure
  const handleRenameProject = async (id: string, name: string) => {
    const oldName = projects.find((p) => p.id === id)?.name || "Untitled Project";
    renameProject(id, name);
    try {
      await studioRequest(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.slice(0, 100) }),
      });
    } catch (error) {
      renameProject(id, oldName); // Rollback
      handleError(error, { operation: "rename project" });
    }
  };

  // Delete project — with rollback on failure
  const handleDeleteProject = async (id: string) => {
    const deletedProject = projects.find((p) => p.id === id);
    removeProject(id);
    try {
      await studioRequest(`/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
    } catch (error) {
      if (deletedProject) {
        setProjects([...projects.filter((p) => p.id !== id), deletedProject]);
      }
      handleError(error, { operation: "delete project" });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-black relative overflow-hidden">
      {/* Animated background beams */}
      <BackgroundBeams className="opacity-20" />
      
      {/* Header */}
      <header className="relative flex h-14 shrink-0 items-center justify-between bg-[#141517] shadow-[0_0_10px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl px-6 z-10">
        <StudioLogo />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3.5 py-2 transition-all duration-300 hover:shadow-[0_0_8px_0_rgba(255,184,0,0.3)]">
            <Coins className="h-3.5 w-3.5 text-amber-400/90" />
            {isLoadingCredits ? (
              <Skeleton className="h-4 w-12 bg-white/10 rounded-md" />
            ) : (
              <span className="font-mono text-sm font-semibold text-white/80 tabular-nums">{balance}</span>
            )}
          </div>
          <div className="transition-all duration-300 hover:scale-105">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { avatarBox: "h-8 w-8 ring-2 ring-white/[0.08]" } }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative flex-1 overflow-y-auto z-10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Hero Section */}
          <div className="mb-12 flex items-end justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                Your Projects
              </h1>
              <p className="text-sm md:text-base text-white/50 max-w-md leading-relaxed">
                Create, manage, and edit your AI-powered image projects
              </p>
            </div>
            <Button
              onClick={handleCreateProject}
              disabled={isCreating}
              className="gap-2 bg-primary text-black hover:bg-primary/90 font-semibold shadow-[0_0_15px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              New Project
            </Button>
          </div>

          {/* Loading state */}
          {isLoadingProjects && projects.length === 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06]">
                  <Skeleton className="aspect-[4/3] w-full bg-white/[0.04]" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/[0.06]" />
                    <Skeleton className="h-3 w-1/2 bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoadingProjects && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="relative mb-10">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#141517] shadow-[0_0_15px_0_rgba(0,0,0,0.6)]">
                  <Sparkles className="h-14 w-14 text-white/[0.2] animate-pulse" />
                </div>
                <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-primary animate-pulse" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-white/90">
                No projects yet
              </h2>
              <p className="mb-10 max-w-md text-center text-base text-white/50 leading-relaxed">
                Create your first project to start generating, editing, and enhancing images with AI tools.
              </p>
              <Button
                onClick={handleCreateProject}
                disabled={isCreating}
                className="gap-2 bg-primary text-black hover:bg-primary/90 font-semibold shadow-[0_0_15px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-105"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                Create First Project
              </Button>
            </div>
          )}

          {/* Projects grid */}
          {!isLoadingProjects && projects.length > 0 && (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 animate-in fade-in duration-700">
              {/* Create new card */}
              <button
                onClick={handleCreateProject}
                disabled={isCreating}
                className={cn(
                  "flex flex-col items-center justify-center gap-4 rounded-2xl bg-[#141517]",
                  "aspect-[4/3] transition-all duration-500",
                  "shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:shadow-[0_0_12px_0_rgba(0,0,0,0.5)] hover:scale-105",
                  "group cursor-pointer"
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.08] transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110">
                  <Plus className="h-6 w-6 text-white/30 transition-all duration-500 group-hover:text-primary group-hover:rotate-90" />
                </div>
                <span className="text-xs font-semibold text-white/40 transition-colors duration-300 group-hover:text-white/70">
                  New Project
                </span>
              </button>

              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => handleOpenProject(project)}
                  onRename={(name) => handleRenameProject(project.id, name)}
                  onDelete={() => handleDeleteProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
