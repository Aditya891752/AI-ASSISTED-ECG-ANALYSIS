import { useState } from "react";
import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
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
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label>Patient ID</Label>
              <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Search..." />
            </div>
            <div>
              <Label>Label</Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">N</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="V">V</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="Q">Q</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={fromDt} onChange={(e) => setFromDt(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={toDt} onChange={(e) => setToDt(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
          <div className="mt-3">
            <Label>Job ID</Label>
            <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Filter by batch job ID..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="skeleton h-64 rounded-lg" />
          ) : !data || data.items.length === 0 ? (
            <div className="text-sm text-ecg-muted text-center py-16">
              No results yet — run your first screening above.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ecg-muted border-b border-ecg-border">
                    <th className="py-2">Timestamp</th>
                    <th className="py-2">Patient ID</th>
                    <th className="py-2">Beats</th>
                    <th className="py-2">Dominant</th>
                    <th className="py-2">N</th>
                    <th className="py-2">S</th>
                    <th className="py-2">V</th>
                    <th className="py-2">F</th>
                    <th className="py-2">Q</th>
                    <th className="py-2">Abnormal%</th>
                    <th className="py-2">View</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => {
                    const abnormalPct =
                      r.total_beats > 0
                        ? (((r.total_beats - r.label_summary.N) / r.total_beats) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={r.result_id} className="border-b border-ecg-border/50 hover:bg-ecg-bg">
                        <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2">{r.patient_id ?? "—"}</td>
                        <td className="py-2">{r.total_beats}</td>
                        <td className="py-2">{r.dominant_label && <LabelBadge label={r.dominant_label} />}</td>
                        <td className="py-2 text-xs">{r.label_summary.N}</td>
                        <td className="py-2 text-xs">{r.label_summary.S}</td>
                        <td className="py-2 text-xs">{r.label_summary.V}</td>
                        <td className="py-2 text-xs">{r.label_summary.F}</td>
                        <td className="py-2 text-xs">{r.label_summary.Q}</td>
                        <td className="py-2">{abnormalPct}%</td>
                        <td className="py-2">
                          <button
                            onClick={() => setSelected(r)}
                            className="text-ecg-accent hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between mt-4 text-sm text-ecg-muted">
                <div className="flex items-center gap-2">
                  <span>Page size:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    Page {data.page} of {data.pages} ({data.total} total)
                  </span>
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <div className="space-y-4">
              <DialogTitle className="text-lg font-semibold">
                Result detail — {selected.patient_id ?? selected.result_id.slice(0, 8)}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                {(["N", "S", "V", "F", "Q"] as const).map((l) => (
                  <LabelBadge key={l} label={l} count={selected.label_summary[l]} />
                ))}
              </div>
              <BeatTimeline beats={selected.beats} />
              <BeatTable beats={selected.beats} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
