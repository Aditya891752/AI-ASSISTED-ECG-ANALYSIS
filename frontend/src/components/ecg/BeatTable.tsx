import { useState, useMemo } from "react";
import type { BeatClassification } from "@/api/types";
import { LabelBadge } from "./LabelBadge";
import { Button } from "@/components/ui/Button";

const PAGE_SIZE = 20;

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="w-20 h-1.5 rounded-full bg-ecg-border overflow-hidden">
      <div
        className="h-full bg-ecg-accent"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 60;
  const height = 16;
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${(i / (values.length - 1 || 1)) * width},${height - (v / max) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth={1.5} />
    </svg>
  );
}

interface BeatTableProps {
  beats: BeatClassification[];
  onRowClick?: (beatIndex: number) => void;
}

export function BeatTable({ beats, onRowClick }: BeatTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(beats.length / PAGE_SIZE));

  const pageBeats = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return beats.slice(start, start + PAGE_SIZE);
  }, [beats, page]);

  const recentConfidences = beats.slice(0, 20).map((b) => b.confidence);

  if (beats.length === 0) {
    return (
      <div className="text-sm text-ecg-muted text-center py-10">
        No beats to display yet — run an analysis above.
      </div>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ecg-muted border-b border-ecg-border">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Time (s)</th>
            <th className="py-2 pr-2">Label</th>
            <th className="py-2 pr-2">Confidence</th>
            <th className="py-2 pr-2">N%</th>
            <th className="py-2 pr-2">S%</th>
            <th className="py-2 pr-2">V%</th>
            <th className="py-2 pr-2">F%</th>
            <th className="py-2 pr-2">Q%</th>
            <th className="py-2 pr-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {pageBeats.map((beat) => (
            <tr
              key={beat.beat_index}
              onClick={() => onRowClick?.(beat.beat_index)}
              className="border-b border-ecg-border/50 hover:bg-ecg-bg cursor-pointer"
            >
              <td className="py-2 pr-2 text-ecg-muted">{beat.beat_index}</td>
              <td className="py-2 pr-2">{beat.r_peak_time_s.toFixed(3)}</td>
              <td className="py-2 pr-2">
                <LabelBadge label={beat.label} />
              </td>
              <td className="py-2 pr-2">
                <div className="flex items-center gap-2">
                  <ConfidenceBar value={beat.confidence} />
                  <span className="text-xs text-ecg-muted">
                    {(beat.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="py-2 pr-2 text-xs">{(beat.probabilities.N * 100).toFixed(0)}</td>
              <td className="py-2 pr-2 text-xs">{(beat.probabilities.S * 100).toFixed(0)}</td>
              <td className="py-2 pr-2 text-xs">{(beat.probabilities.V * 100).toFixed(0)}</td>
              <td className="py-2 pr-2 text-xs">{(beat.probabilities.F * 100).toFixed(0)}</td>
              <td className="py-2 pr-2 text-xs">{(beat.probabilities.Q * 100).toFixed(0)}</td>
              <td className="py-2 pr-2">
                {beat.beat_index === pageBeats[0].beat_index && (
                  <Sparkline values={recentConfidences} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between mt-3 text-xs text-ecg-muted">
        <span>
          Page {page} of {totalPages} · {beats.length} beats total
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
