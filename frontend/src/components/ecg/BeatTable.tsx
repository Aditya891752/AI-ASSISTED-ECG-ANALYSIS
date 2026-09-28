import { useState, useMemo } from "react";
import type { BeatClassification } from "@/api/types";
import { LabelBadge } from "./LabelBadge";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 15;

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const colorClass =
    pct >= 85 ? "bg-emerald-400" : pct >= 65 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="w-20 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
      <div className={`h-full ${colorClass} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
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

  if (beats.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-10 font-mono">
        No classified beats to display yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-left font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.08]">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Peak (s)</th>
              <th className="py-2.5 px-3">Class</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-2 text-emerald-400">N%</th>
              <th className="py-2.5 px-2 text-amber-400">S%</th>
              <th className="py-2.5 px-2 text-rose-400">V%</th>
              <th className="py-2.5 px-2 text-violet-400">F%</th>
              <th className="py-2.5 px-2 text-slate-400">Q%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {pageBeats.map((beat) => (
              <tr
                key={beat.beat_index}
                onClick={() => onRowClick?.(beat.beat_index)}
                className="hover:bg-white/[0.04] cursor-pointer transition-colors group"
              >
                <td className="py-2.5 px-3 text-slate-400">{beat.beat_index}</td>
                <td className="py-2.5 px-3 text-slate-300">{beat.r_peak_time_s.toFixed(3)}s</td>
                <td className="py-2.5 px-3">
                  <LabelBadge label={beat.label} size="sm" />
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <ConfidenceBar value={beat.confidence} />
                    <span className="text-[11px] font-semibold text-slate-200">
                      {(beat.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-slate-400">{(beat.probabilities.N * 100).toFixed(0)}%</td>
                <td className="py-2.5 px-2 text-amber-400/90">{(beat.probabilities.S * 100).toFixed(0)}%</td>
                <td className="py-2.5 px-2 text-rose-400 font-semibold">{(beat.probabilities.V * 100).toFixed(0)}%</td>
                <td className="py-2.5 px-2 text-violet-400">{(beat.probabilities.F * 100).toFixed(0)}%</td>
                <td className="py-2.5 px-2 text-slate-500">{(beat.probabilities.Q * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
        <span>
          Page {page} of {totalPages} &bull; {beats.length} total beats
        </span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
