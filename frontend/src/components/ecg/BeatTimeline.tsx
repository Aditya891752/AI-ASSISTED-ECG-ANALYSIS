import type { BeatClassification } from "@/api/types";
import { colorForLabel } from "@/utils/labelColors";
import { cn } from "@/utils/cn";

interface BeatTimelineProps {
  beats: BeatClassification[];
  selectedIndex?: number | null;
  onSelect?: (beatIndex: number) => void;
}

export function BeatTimeline({ beats, selectedIndex, onSelect }: BeatTimelineProps) {
  if (beats.length === 0) {
    return (
      <div className="text-xs text-ecg-muted py-4 text-center">
        No beats detected yet.
      </div>
    );
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {beats.map((beat) => {
        const isAbnormal = beat.label === "V" || beat.label === "S" || beat.label === "F";
        const isSelected = selectedIndex === beat.beat_index;
        return (
          <button
            key={beat.beat_index}
            onClick={() => onSelect?.(beat.beat_index)}
            title={`Beat ${beat.beat_index} · ${beat.label} · ${(beat.confidence * 100).toFixed(0)}%`}
            className={cn(
              "shrink-0 h-8 w-4 rounded-sm transition-transform hover:scale-110",
              isAbnormal && "animate-pulseGlow",
              isSelected && "ring-2 ring-white"
            )}
            style={{ backgroundColor: colorForLabel(beat.label) }}
          />
        );
      })}
    </div>
  );
}
