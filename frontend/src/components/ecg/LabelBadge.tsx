import { colorForLabel, nameForLabel } from "@/utils/labelColors";
import { cn } from "@/utils/cn";

interface LabelBadgeProps {
  label: string;
  count?: number;
  showName?: boolean;
  className?: string;
}

export function LabelBadge({ label, count, showName = false, className }: LabelBadgeProps) {
  const color = colorForLabel(label);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
      style={{ backgroundColor: `${color}22`, color }}
      title={nameForLabel(label)}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {showName ? nameForLabel(label) : label}
      {count !== undefined && <span className="opacity-70">· {count}</span>}
    </span>
  );
}
