import { useEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  WifiOff,
  Radio,
  Heart,
  AlertTriangle,
  Clock,
  Activity,
  Sliders,
  Terminal,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { ECGWaveform } from "@/components/ecg/ECGWaveform";
import { LabelBadge } from "@/components/ecg/LabelBadge";
import { useEcgWebSocket } from "@/hooks/useWebSocket";
import { generateDemoChunk } from "@/utils/demoSignal";
import { cn } from "@/utils/cn";

export function Stream() {
  const { status, results, log, connect, disconnect, sendChunk, clearResults } = useEcgWebSocket();

  const [patientId, setPatientId] = useState("");
  const [sampleRate, setSampleRate] = useState(360);
  const [chunkSize, setChunkSize] = useState(720);
  const [chunkInterval, setChunkInterval] = useState(1000);
  const [useDemo, setUseDemo] = useState(true);
  const [signalBuffer, setSignalBuffer] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sequenceRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);

  const isStreaming = status === "connected";

  const handleStart = () => {
    sequenceRef.current = 0;
    setSignalBuffer([]);
    clearResults();
    setStartTime(Date.now());
    connect();
  };

  const handleStop = () => {
    disconnect();
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (elapsedIntervalRef.current) window.clearInterval(elapsedIntervalRef.current);
  };

  useEffect(() => {
    if (status === "connected") {
      intervalRef.current = window.setInterval(() => {
        const chunk = useDemo
          ? generateDemoChunk(chunkSize, sampleRate, 68 + Math.floor(Math.random() * 12))
          : new Array(chunkSize).fill(0);
        setSignalBuffer((prev) => [...prev, ...chunk].slice(-sampleRate * 10));
        sendChunk({
          samples: chunk,
          sample_rate: sampleRate,
          patient_id: patientId || undefined,
          sequence: sequenceRef.current++,
        });
      }, chunkInterval);

      elapsedIntervalRef.current = window.setInterval(() => {
        if (startTime) setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (elapsedIntervalRef.current) window.clearInterval(elapsedIntervalRef.current);
    };
  }, [status]);

  const beatsAsClassifications = results.map((r) => ({
    beat_index: r.beat_index,
    r_peak_sample: signalBuffer.length - (chunkSize - (r.buffer_sample_offset ?? 0)),
    r_peak_time_s: r.r_peak_time_s,
    label: r.label,
    confidence: r.confidence,
    probabilities: r.probabilities,
  }));

  const abnormalCount = results.filter((r) => r.label === "V" || r.label === "S").length;
  const bpm = elapsed > 2 ? Math.round((results.length / elapsed) * 60) : (isStreaming ? 72 : 0);

  // Format elapsed time as MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Telemetry View */}
      <div className="lg:col-span-8 space-y-6">
        {/* Stream Status Header */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c152a]/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-center transition-all",
                isStreaming
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400"
              )}
            >
              {isStreaming ? (
                <Radio className="h-5 w-5 animate-pulse" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">
                  {isStreaming ? "TELEMETRY STREAM ACTIVE" : "TELEMETRY STANDBY"}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase",
                    isStreaming
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/[0.05] text-slate-400 border border-white/[0.08]"
                  )}
                >
                  {status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                FastAPI WebSocket Gateway &bull; /ws/v1/stream &bull; Lead II
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-500 block">Session Timer</span>
              <span className="text-base font-bold text-cyan-300">{formatTimer(elapsed)}</span>
            </div>
          </div>
        </div>

        {/* Live ECG Waveform Oscilloscope */}
        <ECGWaveform
          signal={signalBuffer.length > 0 ? signalBuffer : [0]}
          sampleRate={sampleRate}
          beats={beatsAsClassifications.filter((b) => b.r_peak_sample >= 0)}
          windowSeconds={10}
          height={320}
        />

        {/* 4 Stat Telemetry Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400 animate-heartbeat" />
              <span>Instant Heart Rate</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-1">
              {bpm || "—"} <span className="text-xs font-normal text-slate-400">BPM</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>Beats Classified</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1">
              {results.length} <span className="text-xs font-normal text-slate-400">beats</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Abnormal Ectopics</span>
            </div>
            <div className={cn("text-2xl font-extrabold font-mono mt-1", abnormalCount > 0 ? "text-rose-400" : "text-emerald-400")}>
              {abnormalCount}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0c152a]/70 p-3.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Sampling Rate</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
              {sampleRate} <span className="text-xs font-normal text-slate-400">Hz</span>
            </div>
          </div>
        </div>

        {/* Live Beat Ticker */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Live Classification Stream Ticker</span>
              </CardTitle>
              <span className="text-[11px] font-mono text-slate-400">Most recent 25 beats</span>
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-mono">
                Awaiting telemetry transmission — click Start Streaming to begin live classification.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {results.slice(-25).reverse().map((r, i) => (
                  <div key={i} className="shrink-0 flex flex-col items-center gap-1">
                    <LabelBadge label={r.label} size="sm" />
                    <span className="text-[9px] font-mono text-slate-500">
                      {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle>
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Stream Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Patient Identifier</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={isStreaming}
                placeholder="e.g. PT-LIVE-01"
                className="font-mono text-xs bg-black/40 border-white/[0.1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Sampling Rate</Label>
              <Select value={String(sampleRate)} onValueChange={(v) => setSampleRate(Number(v))} disabled={isStreaming}>
                <SelectTrigger className="h-9 bg-black/40 border-white/[0.1] text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0c152a] border-white/[0.1] text-slate-200">
                  <SelectItem value="360" className="text-xs font-mono">360 Hz (PhysioNet MIT-BIH)</SelectItem>
                  <SelectItem value="500" className="text-xs font-mono">500 Hz (PTB Diagnostic)</SelectItem>
                  <SelectItem value="1000" className="text-xs font-mono">1000 Hz (High Resolution)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Chunk Size</span>
                <span className="font-mono text-cyan-400 font-semibold">{chunkSize} samples ({(chunkSize / sampleRate).toFixed(1)}s)</span>
              </div>
              <Slider
                min={360}
                max={1440}
                step={90}
                value={[chunkSize]}
                onValueChange={([v]) => setChunkSize(v)}
                disabled={isStreaming}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Chunk Interval</span>
                <span className="font-mono text-cyan-400 font-semibold">{chunkInterval} ms</span>
              </div>
              <Slider
                min={500}
                max={3000}
                step={100}
                value={[chunkInterval]}
                onValueChange={([v]) => setChunkInterval(v)}
                disabled={isStreaming}
              />
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Hardware Simulation</div>
                <div className="text-[11px] text-slate-400">Stream synthetic biological QRS pulses</div>
              </div>
              <input
                type="checkbox"
                checked={useDemo}
                onChange={(e) => setUseDemo(e.target.checked)}
                className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {isStreaming ? (
              <Button variant="danger" className="w-full h-11 text-sm font-bold shadow-xl" onClick={handleStop}>
                <Square className="h-4 w-4 fill-current" />
                <span>Disconnect Stream</span>
              </Button>
            ) : (
              <Button variant="success" className="w-full h-11 text-sm font-bold shadow-xl" onClick={handleStart}>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Telemetry Stream</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* WebSocket Diagnostic Console Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>WebSocket Frame Log</span>
              </CardTitle>
              <span className="text-[10px] font-mono text-slate-500">Live Socket Frames</span>
            </div>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No frames received yet.</p>
            ) : (
              <ul className="space-y-1.5 text-[11px] font-mono text-slate-400 max-h-48 overflow-y-auto pr-1">
                {log.slice(-10).reverse().map((entry, i) => (
                  <li key={i} className="flex items-center justify-between py-0.5 border-b border-white/[0.04]">
                    <span className="text-cyan-400">[{entry.timestamp}]</span>
                    <span className="text-slate-300 font-semibold">{entry.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
