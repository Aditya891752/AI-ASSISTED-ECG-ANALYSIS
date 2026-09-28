import React from "react";
import { cn } from "@/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "cyan" | "emerald" | "amber" | "rose" | "none";
  interactive?: boolean;
}

export function Card({ className, glow = "none", interactive = false, ...props }: CardProps) {
  const glowClasses = {
    none: "",
    cyan: "border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-cyan-500/10",
    emerald: "border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-emerald-500/10",
    amber: "border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/10",
    rose: "border-rose-500/30 hover:border-rose-400/50 hover:shadow-rose-500/10",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-[#0d1629]/80 backdrop-blur-xl shadow-xl shadow-black/50 transition-all duration-200",
        interactive && "hover:-translate-y-0.5 hover:border-white/[0.18] hover:shadow-2xl hover:shadow-black/70 cursor-pointer",
        glowClasses[glow],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-white/[0.06] flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-slate-400 mt-0.5 font-normal", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
