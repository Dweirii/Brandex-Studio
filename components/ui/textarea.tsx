import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-white transition-colors",
        "placeholder:text-white/30",
        "hover:border-white/[0.1] hover:bg-white/[0.04]",
        "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
