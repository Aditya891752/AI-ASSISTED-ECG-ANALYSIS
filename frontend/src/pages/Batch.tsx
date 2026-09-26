import { useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, X, Download } from "lucide-react";
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
  const [patientPrefix, setPatientPrefix] = useState("BATCH");
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
          showToast("success", "Batch submitted", `${data.total_signals} signals queued`);
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
    <div className="space-y-6 max-w-4xl">
      {!jobId && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Upload signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              className={`rounded-lg border-2 border-dashed p-8 text-center ${
                isDragging ? "border-ecg-accent bg-ecg-accent/5" : "border-ecg-border"
              }`}
            >
              <UploadCloud className="h-8 w-8 mx-auto text-ecg-muted mb-2" />
              <p className="text-sm text-ecg-muted mb-2">
                Drag & drop multiple CSV files — each file is treated as one signal
              </p>
              <input
                type="file"
                multiple
                accept=".csv,.txt"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                className="text-xs"
              />
            </div>

            {files.length > 0 && (
              <ul className="divide-y divide-ecg-border">
                {files.map((entry, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {entry.file.name}{" "}
                      <span className="text-ecg-muted">({entry.sampleCount ?? "…"} samples)</span>
                    </span>
                    <button onClick={() => removeFile(i)} className="text-ecg-muted hover:text-ecg-danger">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Label>Patient ID prefix</Label>
              <Input value={patientPrefix} onChange={(e) => setPatientPrefix(e.target.value)} />
              <p className="text-xs text-ecg-muted mt-1">
                Signals will be tagged {patientPrefix}-001, {patientPrefix}-002, ...
              </p>
            </div>

            <Button
              className="w-full"
              disabled={files.length === 0 || submitBatch.isPending}
              onClick={handleSubmit}
            >
              {submitBatch.isPending ? "Submitting..." : `Submit batch (${files.length} signals)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {jobId && isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-full h-3 rounded-full bg-ecg-border overflow-hidden">
              <div
                className="h-full bg-ecg-accent transition-all duration-500"
                style={{ width: `${jobStatus.data?.progress_pct ?? 0}%` }}
              />
            </div>
            <p className="text-sm text-ecg-muted">
              Processing {jobStatus.data?.processed_signals ?? 0} / {jobStatus.data?.total_signals ?? 0} signals...
            </p>
            <p className="text-xs text-ecg-muted font-mono">
              Job ID: {jobId}{" "}
              <button
                className="underline"
                onClick={() => navigator.clipboard.writeText(jobId)}
              >
                copy
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {jobId && isComplete && jobStatus.data?.result_summary && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-ecg-muted">Total beats</p>
                <p className="text-xl font-bold">{jobStatus.data.result_summary.total_beats}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-ecg-muted">Abnormal rate</p>
                <p className="text-xl font-bold text-ecg-danger">
                  {(jobStatus.data.result_summary.abnormal_beat_rate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-ecg-muted">Signals w/ abnormal</p>
                <p className="text-xl font-bold">
                  {jobStatus.data.result_summary.signals_with_abnormal_beats}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-ecg-muted">Failed</p>
                <p className="text-xl font-bold">{jobStatus.data.result_summary.failed_signals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-ecg-muted">Time taken</p>
                <p className="text-xl font-bold">
                  {jobStatus.data.started_at && jobStatus.data.completed_at
                    ? `${(
                        (new Date(jobStatus.data.completed_at).getTime() -
                          new Date(jobStatus.data.started_at).getTime()) /
                        1000
                      ).toFixed(1)}s`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Label breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={labelChartData} layout="vertical">
                  <CartesianGrid stroke="#1f2d3d" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2d3d" }} />
                  <Legend />
                  {(["N", "S", "V", "F", "Q"] as const).map((label) => (
                    <Bar key={label} dataKey={label} stackId="a" fill={LABEL_COLORS[label]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Results</CardTitle>
              <Button size="sm" variant="secondary" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4" /> Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {(jobStatus.data.result_ids ?? []).map((id) => (
                  <li key={id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-ecg-muted">{id}</span>
                    <Link to="/history" className="text-ecg-accent hover:underline text-xs">
                      View in history
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Button variant="secondary" onClick={() => { setJobId(null); setFiles([]); }}>
            Run another batch
          </Button>
        </>
      )}

      {jobStatus.data?.status === "failed" && (
        <div className="rounded-lg bg-ecg-danger/10 border border-ecg-danger text-ecg-danger px-4 py-3 text-sm">
          Batch job failed: {jobStatus.data.error_message ?? "Unknown error"}
        </div>
      )}
    </div>
  );
}
