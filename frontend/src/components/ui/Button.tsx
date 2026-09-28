import React from "react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 border border-cyan-300/30 active:scale-[0.98]",
  secondary:
    "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] hover:border-white/[0.2] shadow-sm active:scale-[0.98]",
  success:
    "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 border border-emerald-300/30 active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold shadow-lg shadow-rose-600/30 border border-rose-400/20 active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white border border-transparent",
  outline:
    "bg-transparent border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs font-semibold rounded-lg",
  md: "h-10 px-4 text-sm font-semibold rounded-xl",
  lg: "h-12 px-6 text-base font-bold rounded-xl",
  icon: "h-9 w-9 rounded-xl flex items-center justify-center p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer select-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
