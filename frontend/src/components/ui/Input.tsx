import React from "react";
import { cn } from "@/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-ecg-border bg-ecg-bg px-3 text-sm text-white placeholder:text-ecg-muted focus:outline-none focus:ring-2 focus:ring-ecg-accent/50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-lg border border-ecg-border bg-ecg-bg px-3 py-2 text-sm text-white placeholder:text-ecg-muted focus:outline-none focus:ring-2 focus:ring-ecg-accent/50 font-mono",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
