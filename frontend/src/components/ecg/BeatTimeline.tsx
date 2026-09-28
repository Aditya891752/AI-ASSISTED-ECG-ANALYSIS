import type { BeatClassification } from "@/api/types";
import { colorForLabel, nameForLabel } from "@/utils/labelColors";
import { cn } from "@/utils/cn";

interface BeatTimelineProps {
  beats: BeatClassification[];
  selectedIndex?: number | null;
  onSelect?: (beatIndex: number) => void;
}

export function BeatTimeline({ beats, selectedIndex, onSelect }: BeatTimelineProps) {
  if (beats.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center font-mono">
        No beats segmented yet.
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
      {beats.map((beat) => {
        const isAbnormal = beat.label === "V" || beat.label === "S" || beat.label === "F";
        const isSelected = selectedIndex === beat.beat_index;
        const color = colorForLabel(beat.label);

        return (
          <button
            key={beat.beat_index}
            onClick={() => onSelect?.(beat.beat_index)}
            title={`Beat #${beat.beat_index} (${beat.label} · ${nameForLabel(beat.label)}) — ${(beat.confidence * 100).toFixed(1)}% confidence`}
            className={cn(
              "shrink-0 h-10 w-5 rounded-md flex flex-col items-center justify-between py-1 transition-all duration-150 cursor-pointer select-none",
              isAbnormal && "animate-pulseGlow",
              isSelected
                ? "ring-2 ring-white scale-110 shadow-lg z-10"
                : "opacity-85 hover:opacity-100 hover:scale-105"
            )}
            style={{
              backgroundColor: `${color}25`,
              borderColor: color,
              borderWidth: 1,
              boxShadow: isSelected ? `0 0 12px ${color}` : undefined,
            }}
          >
            <span
              className="text-[9px] font-mono font-bold"
              style={{ color }}
            >
              {beat.label}
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          </button>
        );
      })}
    </div>
  );
}
