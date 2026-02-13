import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md bg-[#141517] px-3 py-2 text-sm shadow-[0_0_8px_0_rgba(0,0,0,0.4)] transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[0_0_10px_0_rgba(0,0,0,0.5)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
