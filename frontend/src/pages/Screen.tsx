import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UploadCloud,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  Clock,
  Heart,
  FileCode,
  Sparkles,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { useScreening } from "@/hooks/useScreening";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ECGWaveform } from "@/components/ecg/ECGWaveform";
import { LabelBadge } from "@/components/ecg/LabelBadge";
import { BeatTimeline } from "@/components/ecg/BeatTimeline";
import { BeatTable } from "@/components/ecg/BeatTable";
import { parseSignalText, parseSignalFile } from "@/utils/signalParser";
import { generateDemoSignal } from "@/utils/demoSignal";
import { messageForError } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

export function Screen() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const screening = useScreening();

  const [signal, setSignal] = useState<number[]>([]);
  const [sampleRate, setSampleRate] = useState(360);
  const [patientId, setPatientId] = useState("");
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSubmitted = useRef(false);

  const handleFile = async (file: File) => {
    const result = await parseSignalFile(file);
    setSignal(result.values);
    setParseWarnings(result.errors);
    showToast("info", "File loaded", `${result.values.length} samples extracted from ${file.name}`);
  };

  const handlePaste = (text: string) => {
    const result = parseSignalText(text);
    setSignal(result.values);
    setParseWarnings(result.errors);
  };

  const handleGenerateDemo = (bpm = 72) => {
    const demo = generateDemoSignal(10, 360, bpm);
    setSignal(demo);
    setSampleRate(360);
    setParseWarnings([]);
    showToast("success", `Synthetic ECG Generated (${bpm} BPM)`, `${demo.length} samples @ 360 Hz`);
  };

  const handleSubmit = () => {
    if (signal.length < 360) {
      showToast("error", "Signal too short", "Minimum 360 samples (1.0s @ 360Hz) required.");
      return;
    }
    screening.mutate(
      { signal, sample_rate: sampleRate, patient_id: patientId || undefined },
      {
        onSuccess: () => showToast("success", "Clinical Analysis Complete", "Fiducial peaks segmented and classified."),
        onError: (err) => showToast("error", "Analysis failed", messageForError(err)),
      }
    );
  };

  // Demo Mode: auto-fill and auto-submit when navigated here with ?demo=1
  useEffect(() => {
    if (searchParams.get("demo") === "1" && !autoSubmitted.current) {
      autoSubmitted.current = true;
      const demo = generateDemoSignal(10, 360, 74);
      setSignal(demo);
      setPatientId("PT-DEMO-001");
      screening.mutate(
        { signal: demo, sample_rate: 360, patient_id: "PT-DEMO-001" },
        {
          onSuccess: () => showToast("success", "Demo Analysis Complete", "Demonstration strip processed."),
          onError: (err) => showToast("error", "Demo analysis failed", messageForError(err)),
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const result = screening.data;
  const abnormalBeats = result?.beats.filter((b) => b.label === "V" || b.label === "S") ?? [];
  const ventricularBeats = result?.beats.filter((b) => b.label === "V") ?? [];

  // Calculate mean HR from R-peaks if available
  const estimatedHR = result && result.beats.length > 1
    ? Math.round((result.beats.length / (result.signal_length_samples / result.sample_rate)) * 60)
    : 72;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left panel: Signal Ingestion */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <FileCode className="h-4 w-4 text-cyan-400" />
                <span>Signal Intake &amp; Patient Setup</span>
              </CardTitle>
              <span className="text-[11px] font-mono text-cyan-400">LEAD II</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs defaultValue="upload">
              <TabsList className="grid grid-cols-3 w-full bg-white/[0.04] p-1 rounded-xl">
                <TabsTrigger value="upload" className="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950">
                  File Upload
                </TabsTrigger>
                <TabsTrigger value="paste" className="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950">
                  Paste Raw
                </TabsTrigger>
                <TabsTrigger value="demo" className="rounded-lg text-xs font-semibold data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950">
                  Synthesizer
                </TabsTrigger>
              </TabsList>

              {/* Upload Dropzone */}
              <TabsContent value="upload" className="mt-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 group ${
                    isDragging
                      ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                      : "border-white/[0.12] hover:border-cyan-500/50 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drop ECG signal file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports <span className="font-mono text-cyan-400">.csv</span> or <span className="font-mono text-cyan-400">.txt</span> formatted microvolt amplitude series
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-400">Single Column</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-400">Comma Separated</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-400">PhysioNet WFDB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              </TabsContent>

              {/* Paste Raw Signal */}
              <TabsContent value="paste" className="mt-4">
                <Textarea
                  rows={6}
                  className="font-mono text-xs bg-black/40 border-white/[0.1] focus:border-cyan-400"
                  placeholder="Paste comma or newline-delimited voltage points:&#10;0.12, -0.04, 0.45, 1.02, -0.15, 0.08, ..."
                  onChange={(e) => handlePaste(e.target.value)}
                />
              </TabsContent>

              {/* Synthetic Signal Presets */}
              <TabsContent value="demo" className="mt-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Generate verified synthetic physiological waveforms modeled after PhysioNet MIT-BIH recordings:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateDemo(72)}
                    className="justify-start text-xs font-mono"
                  >
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Normal Sinus (72 BPM)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateDemo(108)}
                    className="justify-start text-xs font-mono"
                  >
                    <Activity className="h-3.5 w-3.5 text-amber-400" />
                    <span>Tachycardia (108 BPM)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateDemo(54)}
                    className="justify-start text-xs font-mono"
                  >
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Bradycardia (54 BPM)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateDemo(86)}
                    className="justify-start text-xs font-mono"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>Arrhythmic Ectopy</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Signal Status Counter */}
            {signal.length > 0 && (
              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  {signal.length.toLocaleString()} Samples Buffered
                </span>
                <span className="text-slate-400">
                  Duration: {(signal.length / sampleRate).toFixed(1)}s
                </span>
              </div>
            )}

            {/* Metadata Parameters */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Sampling Rate (Hz)</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min={100}
                    max={1000}
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                    className="font-mono text-xs bg-black/40 border-white/[0.1]"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSampleRate(360)}
                    className="text-[10px] font-mono px-2"
                    title="Set to MIT-BIH 360 Hz standard"
                  >
                    360
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Patient Identifier</Label>
                <Input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. PT-2041"
                  maxLength={64}
                  className="font-mono text-xs bg-black/40 border-white/[0.1]"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <Button
              className="w-full h-11 text-sm font-bold shadow-xl"
              onClick={handleSubmit}
              disabled={screening.isPending || signal.length < 360}
            >
              {screening.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Butterworth &amp; 221-D Model...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Run AI Diagnostic Screening</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right panel: Clinical Results */}
      <div className="lg:col-span-7 space-y-6">
        {!result && !screening.isPending && (
          <Card className="border-dashed border-white/[0.1]">
            <CardContent className="text-center py-24 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity className="h-8 w-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Awaiting ECG Signal Intake</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Upload a patient ECG file or click <span className="text-cyan-400 font-semibold cursor-pointer" onClick={() => handleGenerateDemo(72)}>Synthesizer</span> on the left to inspect real-time QRS wave segmentation.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {screening.isPending && (
          <Card>
            <CardContent className="space-y-4 py-8">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-semibold text-cyan-300">
                  EXECUTING CLINICAL PREPROCESSING PIPELINE
                </span>
              </div>
              <div className="skeleton h-56 rounded-2xl" />
              <div className="grid grid-cols-4 gap-4">
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {/* Triage Alert Banner */}
            {ventricularBeats.length > 0 ? (
              <div className="rounded-2xl bg-rose-500/15 border border-rose-500/40 p-4 flex items-center justify-between text-rose-300 shadow-xl shadow-rose-950/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>CRITICAL ARRYTHMIA ALERT: VENTRICULAR ECTOPY (PVC)</span>
                      <span className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-mono text-[10px] font-extrabold">
                        HIGH PRIORITY
                      </span>
                    </div>
                    <div className="text-xs text-rose-300/80 mt-0.5">
                      {ventricularBeats.length} Premature Ventricular Contraction{ventricularBeats.length > 1 ? "s" : ""} detected. Immediate physician review recommended.
                    </div>
                  </div>
                </div>
              </div>
            ) : abnormalBeats.length > 0 ? (
              <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-4 flex items-center justify-between text-amber-300 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">
                      CLINICAL REVIEW: SUPRAVENTRICULAR ECTOPY (SVT)
                    </div>
                    <div className="text-xs text-amber-300/80 mt-0.5">
                      {abnormalBeats.length} premature beat{abnormalBeats.length > 1 ? "s" : ""} flagged. Verify rhythm strip context.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 flex items-center justify-between text-emerald-300 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">
                      NORMAL SINUS RHYTHM (NSR) CONFIRMED
                    </div>
                    <div className="text-xs text-emerald-300/80 mt-0.5">
                      All detected complexes exhibit regular morphology and physiological RR intervals.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Biometric Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Heart className="h-3 w-3 text-rose-400 animate-heartbeat" />
                  Heart Rate
                </div>
                <div className="text-2xl font-extrabold font-mono text-white mt-1">
                  {estimatedHR} <span className="text-xs font-normal text-slate-400">BPM</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-cyan-400" />
                  Total Beats
                </div>
                <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1">
                  {result.total_beats} <span className="text-xs font-normal text-slate-400">QRS</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  Inference
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                  {result.inference_duration_ms.toFixed(1)} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-amber-400" />
                  Strip Length
                </div>
                <div className="text-2xl font-extrabold font-mono text-amber-300 mt-1">
                  {(result.signal_length_samples / result.sample_rate).toFixed(1)} <span className="text-xs font-normal text-slate-400">sec</span>
                </div>
              </div>
            </div>

            {/* High-Definition ECG Waveform */}
            <div className="space-y-3">
              <ECGWaveform
                signal={signal}
                sampleRate={result.sample_rate}
                beats={result.beats}
                highlightedBeatIndex={selectedBeat}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex flex-wrap gap-2">
                  {(["N", "S", "V", "F", "Q"] as const).map((l) => (
                    <LabelBadge key={l} label={l} count={result.label_summary[l]} showName />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Pan-Tompkins QRS Detection · 221-D Hybrid Extraction
                </span>
              </div>
            </div>

            {/* Beat Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>
                    <Sliders className="h-4 w-4 text-cyan-400" />
                    <span>Beat Rhythm Timeline</span>
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-400">Click beat to inspect</span>
                </div>
              </CardHeader>
              <CardContent>
                <BeatTimeline
                  beats={result.beats}
                  selectedIndex={selectedBeat}
                  onSelect={setSelectedBeat}
                />
              </CardContent>
            </Card>

            {/* Beat Detail Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <FileCode className="h-4 w-4 text-cyan-400" />
                  <span>Individual Beat Classifications &amp; Calibrated Probabilities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BeatTable beats={result.beats} onRowClick={setSelectedBeat} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
