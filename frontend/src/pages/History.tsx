import { useState } from "react";
import { Eye, Filter, RotateCcw, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { LabelBadge } from "@/components/ecg/LabelBadge";
import { BeatTimeline } from "@/components/ecg/BeatTimeline";
import { BeatTable } from "@/components/ecg/BeatTable";
import { useHistory } from "@/hooks/useHistory";
import type { BeatLabel, ScreeningResult } from "@/api/types";

export function History() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [patientId, setPatientId] = useState("");
  const [label, setLabel] = useState<string>("");
  const [fromDt, setFromDt] = useState("");
  const [toDt, setToDt] = useState("");
  const [jobId, setJobId] = useState("");
  const [selected, setSelected] = useState<ScreeningResult | null>(null);

  const { data, isLoading } = useHistory({
    page,
    page_size: pageSize,
    patient_id: patientId || undefined,
    label: (label || undefined) as BeatLabel | undefined,
    from_dt: fromDt || undefined,
    to_dt: toDt || undefined,
    job_id: jobId || undefined,
  });

  const clearFilters = () => {
    setPatientId("");
    setLabel("");
    setFromDt("");
    setToDt("");
    setJobId("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Card */}
      <Card className="border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Filter className="h-4 w-4 text-cyan-400" />
              <span>Diagnostic Filter &amp; Audit Query</span>
            </CardTitle>
            <span className="text-[11px] font-mono text-slate-400">TimescaleDB Audit Log</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Patient Identifier</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Search patient..."
                className="font-mono text-xs bg-black/40 border-white/[0.1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Dominant Rhythm</Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger className="h-9 bg-black/40 border-white/[0.1] text-xs font-mono">
                  <SelectValue placeholder="All Rhythms" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c152a] border-white/[0.1] text-slate-200">
                  <SelectItem value="ALL" className="text-xs">All Classes</SelectItem>
                  <SelectItem value="N" className="text-xs font-mono">N &bull; Normal Sinus</SelectItem>
                  <SelectItem value="S" className="text-xs font-mono">S &bull; Supraventricular</SelectItem>
                  <SelectItem value="V" className="text-xs font-mono">V &bull; Ventricular PVC</SelectItem>
                  <SelectItem value="F" className="text-xs font-mono">F &bull; Fusion</SelectItem>
                  <SelectItem value="Q" className="text-xs font-mono">Q &bull; Paced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">From Date</Label>
              <Input
                type="date"
                value={fromDt}
                onChange={(e) => setFromDt(e.target.value)}
                className="font-mono text-xs bg-black/40 border-white/[0.1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">To Date</Label>
              <Input
                type="date"
                value={toDt}
                onChange={(e) => setToDt(e.target.value)}
                className="font-mono text-xs bg-black/40 border-white/[0.1]"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={clearFilters}
              className="text-xs h-9 font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </Button>
          </div>

          <div className="pt-2 border-t border-white/[0.04]">
            <Label className="text-[11px] text-slate-400">Filter by Batch Job ID</Label>
            <Input
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="e.g. 804c008b-3905-..."
              className="font-mono text-xs bg-black/40 border-white/[0.1] mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <div className="skeleton rounded-xl h-12 w-full" />
              <div className="skeleton rounded-xl h-12 w-full" />
              <div className="skeleton rounded-xl h-12 w-full" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <Activity className="h-10 w-10 mx-auto text-slate-600 animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">No matching clinical records found</p>
              <p className="text-xs text-slate-500">Run a screening or adjust the query filters above.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02] border-b border-white/[0.08]">
                      <th className="py-3.5 px-4">Recorded At</th>
                      <th className="py-3.5 px-4">Patient ID</th>
                      <th className="py-3.5 px-4">Beats</th>
                      <th className="py-3.5 px-4">Dominant</th>
                      <th className="py-3.5 px-3 font-mono text-emerald-400">N</th>
                      <th className="py-3.5 px-3 font-mono text-amber-400">S</th>
                      <th className="py-3.5 px-3 font-mono text-rose-400">V</th>
                      <th className="py-3.5 px-3 font-mono text-violet-400">F</th>
                      <th className="py-3.5 px-3 font-mono text-slate-400">Q</th>
                      <th className="py-3.5 px-4">Abnormal %</th>
                      <th className="py-3.5 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.items.map((r) => {
                      const abnormalPct =
                        r.total_beats > 0
                          ? (((r.total_beats - r.label_summary.N) / r.total_beats) * 100).toFixed(1)
                          : "0.0";
                      const isHigh = parseFloat(abnormalPct) > 15;

                      return (
                        <tr
                          key={r.result_id}
                          className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                          onClick={() => setSelected(r)}
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                            {new Date(r.created_at).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "medium",
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                            <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                              {r.patient_id ?? "ANON"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {r.total_beats}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.dominant_label && <LabelBadge label={r.dominant_label} size="sm" />}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-xs text-slate-400">{r.label_summary.N}</td>
                          <td className="py-3.5 px-3 font-mono text-xs text-amber-400/90">{r.label_summary.S}</td>
                          <td className="py-3.5 px-3 font-mono text-xs text-rose-400 font-semibold">{r.label_summary.V}</td>
                          <td className="py-3.5 px-3 font-mono text-xs text-violet-400">{r.label_summary.F}</td>
                          <td className="py-3.5 px-3 font-mono text-xs text-slate-500">{r.label_summary.Q}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`font-mono font-semibold text-xs ${
                                isHigh ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {abnormalPct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(r);
                              }}
                              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/20 transition-all"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/[0.06] text-xs text-slate-400 gap-3">
                <div className="flex items-center gap-2">
                  <span>Page size:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-20 h-8 bg-black/40 border-white/[0.1] text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c152a] border-white/[0.1] text-slate-200">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">
                    Page {data.page} of {data.pages} ({data.total} records)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-8 px-2.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= data.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 px-2.5"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Inspection Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#0a1124] border-cyan-500/30">
          {selected && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    <span>Clinical Trace &mdash; {selected.patient_id ?? selected.result_id.slice(0, 8)}</span>
                  </DialogTitle>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Recorded {new Date(selected.created_at).toLocaleString()} &bull; {selected.total_beats} Total Beats
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(["N", "S", "V", "F", "Q"] as const).map((l) => (
                    <LabelBadge key={l} label={l} count={selected.label_summary[l]} size="sm" />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-slate-400">Beat Rhythm Timeline</div>
                <BeatTimeline beats={selected.beats} />
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-slate-400">Beat-by-Beat Classifications</div>
                <BeatTable beats={selected.beats} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
