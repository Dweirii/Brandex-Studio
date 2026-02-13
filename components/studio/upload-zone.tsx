"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isDisabled?: boolean;
}

export function UploadZone({ onUpload, isDisabled }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0];
        if (error.code === "file-too-large") {
          toast.error("File is too large. Maximum size is 10MB.");
        } else if (error.code === "file-invalid-type") {
          toast.error("Invalid file type. Please upload PNG, JPEG, or WebP.");
        } else {
          toast.error(`Upload error: ${error.message}`);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isDisabled,
    noClick: false,
    noKeyboard: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-8 rounded-3xl p-20 transition-all duration-500 cursor-pointer overflow-hidden bg-[#141517]",
        isDragActive
          ? "shadow-[0_0_15px_0_rgba(0,0,0,0.5)] scale-[0.98]"
          : "shadow-[0_0_10px_0_rgba(0,0,0,0.6)] hover:shadow-[0_0_12px_0_rgba(255,255,255,0.1)]",
        isDisabled && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-500 z-10",
          isDragActive
            ? "bg-primary/20 scale-110"
            : "bg-white/[0.06] group-hover:bg-white/[0.1] group-hover:scale-105"
        )}
      >
        {isDragActive ? (
          <Upload className="h-9 w-9 text-primary animate-pulse" />
        ) : (
          <ImageIcon className="h-9 w-9 text-white/20 group-hover:text-white/40 transition-all duration-500 group-hover:scale-110" />
        )}
      </div>

      {/* Text */}
      <div className="text-center space-y-3 relative z-10">
        <p className={cn(
          "text-base font-semibold tracking-wide transition-all duration-300",
          isDragActive 
            ? "text-primary scale-105" 
            : "text-white/60 group-hover:text-white/80"
        )}>
          {isDragActive ? "Drop to upload" : "Drop image here or click to browse"}
        </p>
        <p className="text-xs text-white/30 font-medium tracking-wider">
          PNG, JPEG, WebP • Max 10MB
        </p>
      </div>

    </div>
  );
}
