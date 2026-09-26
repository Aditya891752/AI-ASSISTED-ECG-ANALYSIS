import { useEffect, useRef, useState } from "react";
import { Play, Square, Wifi, WifiOff } from "lucide-react";
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
          ? generateDemoChunk(chunkSize, sampleRate, 60 + Math.floor(Math.random() * 20))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const bpm = elapsed > 0 ? Math.round((results.length / elapsed) * 60) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live ECG</CardTitle>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                isStreaming ? "text-ecg-success" : "text-ecg-muted"
              )}
            >
              {isStreaming ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {status}
            </span>
          </CardHeader>
          <CardContent>
            <ECGWaveform
              signal={signalBuffer.length > 0 ? signalBuffer : [0]}
              sampleRate={sampleRate}
              beats={beatsAsClassifications.filter((b) => b.r_peak_sample >= 0)}
              windowSeconds={10}
              height={300}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-ecg-muted">Connection</p>
              <p className="font-semibold mt-1 capitalize">{status}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-ecg-muted">Beats/min (est.)</p>
              <p className="font-semibold mt-1">{bpm || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-ecg-muted">Abnormal count</p>
              <p className="font-semibold mt-1 text-ecg-danger">{abnormalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-ecg-muted">Elapsed</p>
              <p className="font-semibold mt-1">{elapsed}s</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Beat ticker</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-ecg-muted text-center py-4">
                No beats yet — start streaming to see live classifications.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {results.slice(-20).map((r, i) => (
                  <LabelBadge key={i} label={r.label} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Patient ID</Label>
              <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} disabled={isStreaming} />
            </div>
            <div>
              <Label>Sample rate</Label>
              <Select value={String(sampleRate)} onValueChange={(v) => setSampleRate(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="360">360 Hz</SelectItem>
                  <SelectItem value="500">500 Hz</SelectItem>
                  <SelectItem value="1000">1000 Hz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chunk size: {chunkSize} samples ({(chunkSize / sampleRate).toFixed(1)}s)</Label>
              <Slider
                min={360}
                max={1440}
                step={90}
                value={[chunkSize]}
                onValueChange={([v]) => setChunkSize(v)}
                disabled={isStreaming}
              />
            </div>
            <div>
              <Label>Chunk interval: {chunkInterval}ms</Label>
              <Slider
                min={500}
                max={3000}
                step={100}
                value={[chunkInterval]}
                onValueChange={([v]) => setChunkInterval(v)}
                disabled={isStreaming}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ecg-muted">
              <input type="checkbox" checked={useDemo} onChange={(e) => setUseDemo(e.target.checked)} />
              Use demo signal
            </label>

            {isStreaming ? (
              <Button variant="danger" className="w-full" onClick={handleStop}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button className="w-full" onClick={handleStart}>
                <Play className="h-4 w-4" /> Start Streaming
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WS message log</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-xs text-ecg-muted">No messages yet.</p>
            ) : (
              <ul className="space-y-1 text-xs font-mono text-ecg-muted">
                {log.map((entry, i) => (
                  <li key={i}>
                    [{entry.timestamp}] {entry.type}
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
