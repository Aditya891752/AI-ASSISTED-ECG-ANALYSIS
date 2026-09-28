import { useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, X, Download, Layers, CheckCircle2, AlertTriangle, ArrowRight, Activity, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useSubmitBatch, useBatchJobStatus } from "@/hooks/useBatchJob";
import { parseSignalFile } from "@/utils/signalParser";
import { messageForError } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LABEL_COLORS } from "@/utils/labelColors";

interface FileEntry {
  file: File;
  sampleCount: number | null;
}

export function Batch() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [patientPrefix, setPatientPrefix] = useState("PT-BATCH");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const submitBatch = useSubmitBatch();
  const jobStatus = useBatchJobStatus(jobId);

  const addFiles = async (fileList: FileList) => {
    const entries: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      const parsed = await parseSignalFile(file);
      entries.push({ file, sampleCount: parsed.values.length });
    }
    setFiles((prev) => [...prev, ...entries]);
    showToast("info", "Files queued", `${fileList.length} files added to batch`);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const signals = await Promise.all(
      files.map(async (entry, i) => {
        const parsed = await parseSignalFile(entry.file);
        return {
          signal: parsed.values,
          sample_rate: 360,
          patient_id: `${patientPrefix}-${String(i + 1).padStart(3, "0")}`,
        };
      })
    );

    submitBatch.mutate(
      { signals },
      {
        onSuccess: (data) => {
          setJobId(data.job_id);
          showToast("success", "Batch Pipeline Dispatched", `${data.total_signals} patient traces queued for Celery processing`);
        },
        onError: (err) => showToast("error", "Batch submission failed", messageForError(err)),
      }
    );
  };

  const handleDownloadCsv = () => {
    if (!jobStatus.data?.result_summary) return;
    const s = jobStatus.data.result_summary;
    const rows = [
      ["metric", "value"],
      ["total_beats", s.total_beats],
      ["abnormal_beat_rate", s.abnormal_beat_rate],
      ["signals_with_abnormal_beats", s.signals_with_abnormal_beats],
      ["failed_signals", s.failed_signals],
      ["N", s.label_counts.N],
      ["S", s.label_counts.S],
      ["V", s.label_counts.V],
      ["F", s.label_counts.F],
      ["Q", s.label_counts.Q],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${jobId}-summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRunning = jobStatus.data && ["pending", "processing"].includes(jobStatus.data.status);
  const isComplete = jobStatus.data?.status === "completed";

  const labelChartData = jobStatus.data?.result_summary
    ? [
        {
          name: "All signals",
          N: jobStatus.data.result_summary.label_counts.N,
          S: jobStatus.data.result_summary.label_counts.S,
          V: jobStatus.data.result_summary.label_counts.V,
          F: jobStatus.data.result_summary.label_counts.F,
          Q: jobStatus.data.result_summary.label_counts.Q,
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-[#0c1833] via-[#091224] to-[#060b17] p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            <span>High-Throughput Diagnostic Queue</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Multi-Patient Holter Batch Processing
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Ingest and classify dozens of 24-hour ambulatory Holter recordings asynchronously with celery background workers and automated diagnostic CSV summarization.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-cyan-300">
            Celery &bull; Redis Queue
          </span>
        </div>
      </div>

      {!jobId && (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle>
              <UploadCloud className="h-4 w-4 text-cyan-400" />
              <span>Step 1 &mdash; Queue Multiple Patient Waveforms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                  : "border-white/[0.12] hover:border-cyan-500/40 hover:bg-white/[0.02]"
              }`}
            >
              <UploadCloud className="h-10 w-10 mx-auto text-cyan-400 mb-3" />
              <p className="text-sm font-semibold text-slate-200">
                Drag &amp; drop multiple ECG CSV recordings
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Each file is processed as an individual patient screening record
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 border border-white/[0.1] cursor-pointer transition-all">
                <span>Select Files from Disk</span>
                <input
                  type="file"
                  multiple
                  accept=".csv,.txt"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 max-h-60 overflow-y-auto space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 pb-2 px-2 border-b border-white/[0.06]">
                  Queued Recordings ({files.length})
                </div>
                {files.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="font-mono text-slate-300">
                      {entry.file.name}{" "}
                      <span className="text-slate-500">({entry.sampleCount?.toLocaleString() ?? "…"} samples)</span>
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Patient Identifier Prefix</Label>
              <Input
                value={patientPrefix}
                onChange={(e) => setPatientPrefix(e.target.value)}
                className="font-mono text-xs bg-black/40 border-white/[0.1]"
              />
              <p className="text-[11px] text-slate-500">
                Signals will be tagged <span className="text-cyan-400 font-mono">{patientPrefix}-001</span>, <span className="text-cyan-400 font-mono">{patientPrefix}-002</span>, etc.
              </p>
            </div>

            <Button
              className="w-full h-11 text-sm font-bold shadow-xl"
              disabled={files.length === 0 || submitBatch.isPending}
              onClick={handleSubmit}
            >
              <Zap className="h-4 w-4" />
              <span>
                {submitBatch.isPending
                  ? "Submitting to Queue..."
                  : `Dispatch Batch Job (${files.length} Patient Traces)`}
              </span>
            </Button>
          </CardContent>
        </Card>
      )}

      {jobId && isRunning && (
        <Card className="border-cyan-500/30">
          <CardHeader>
            <CardTitle>
              <Activity className="h-4 w-4 text-cyan-400 animate-spin" />
              <span>Step 2 &mdash; Asynchronous Worker Execution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full h-3 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${jobStatus.data?.progress_pct ?? 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Processed {jobStatus.data?.processed_signals ?? 0} of {jobStatus.data?.total_signals ?? 0} records
              </span>
              <span className="text-cyan-300 font-bold">
                {jobStatus.data?.progress_pct ?? 0}% Complete
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {jobId && isComplete && jobStatus.data?.result_summary && (
        <div className="space-y-6">
          <Card className="border-emerald-500/30">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Batch Processing Complete &bull; Job {jobId.slice(0, 8)}</span>
                </CardTitle>
                <Button variant="success" size="sm" onClick={handleDownloadCsv}>
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Diagnostic CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metric summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Total Beats</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {jobStatus.data.result_summary.total_beats.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Abnormal Rate</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {(jobStatus.data.result_summary.abnormal_beat_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Abnormal Traces</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    {jobStatus.data.result_summary.signals_with_abnormal_beats}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Failed Records</div>
                  <div className="text-2xl font-bold font-mono text-slate-400 mt-1">
                    {jobStatus.data.result_summary.failed_signals}
                  </div>
                </div>
              </div>

              {/* Bar distribution */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={labelChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#091122",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="N" name="Normal (N)" fill={LABEL_COLORS.N} />
                    <Bar dataKey="S" name="Supraventricular (S)" fill={LABEL_COLORS.S} />
                    <Bar dataKey="V" name="Ventricular (V)" fill={LABEL_COLORS.V} />
                    <Bar dataKey="F" name="Fusion (F)" fill={LABEL_COLORS.F} />
                    <Bar dataKey="Q" name="Paced (Q)" fill={LABEL_COLORS.Q} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setJobId(null);
                    setFiles([]);
                  }}
                >
                  Start New Batch
                </Button>
                <Link to={`/history?job_id=${jobId}`}>
                  <Button variant="primary" size="sm">
                    Inspect in Audit History
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
