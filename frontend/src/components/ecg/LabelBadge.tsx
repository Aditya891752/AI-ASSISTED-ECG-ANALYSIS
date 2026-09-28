import { colorForLabel, nameForLabel } from "@/utils/labelColors";
import { cn } from "@/utils/cn";

interface LabelBadgeProps {
  label: string;
  count?: number;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LabelBadge({ label, count, showName = false, size = "md", className }: LabelBadgeProps) {
  const color = colorForLabel(label);
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-bold tracking-wide border shadow-sm transition-all select-none",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}18`,
        borderColor: `${color}40`,
        color: color,
        boxShadow: `0 0 10px -2px ${color}33`,
      }}
      title={`${label} — ${nameForLabel(label)}`}
    >
      <span
        className="h-2 w-2 rounded-full relative"
        style={{ backgroundColor: color }}
      >
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-60"
          style={{ backgroundColor: color }}
        />
      </span>
      <span>{showName ? `${label} · ${nameForLabel(label)}` : label}</span>
      {count !== undefined && (
        <span className="font-sans font-semibold opacity-75 text-[11px] ml-0.5">
          ({count})
        </span>
      )}
    </span>
  );
}
