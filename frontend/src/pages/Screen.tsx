import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UploadCloud, Wand2, AlertTriangle } from "lucide-react";
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
  };

  const handlePaste = (text: string) => {
    const result = parseSignalText(text);
    setSignal(result.values);
    setParseWarnings(result.errors);
  };

  const handleGenerateDemo = () => {
    const demo = generateDemoSignal(10, 360, 60 + Math.floor(Math.random() * 30));
    setSignal(demo);
    setSampleRate(360);
    setParseWarnings([]);
    showToast("success", "Demo signal generated", `${demo.length} samples @ 360 Hz`);
  };

  const handleSubmit = () => {
    if (signal.length < 360) {
      showToast("error", "Signal too short", "Minimum 360 samples required.");
      return;
    }
    screening.mutate(
      { signal, sample_rate: sampleRate, patient_id: patientId || undefined },
      {
        onSuccess: () => showToast("success", "Analysis complete"),
        onError: (err) => showToast("error", "Analysis failed", messageForError(err)),
      }
    );
  };

  // Demo Mode: auto-fill and auto-submit when navigated here with ?demo=1
  useEffect(() => {
    if (searchParams.get("demo") === "1" && !autoSubmitted.current) {
      autoSubmitted.current = true;
      const demo = generateDemoSignal(10, 360, 72);
      setSignal(demo);
      setPatientId("DEMO-001");
      screening.mutate(
        { signal: demo, sample_rate: 360, patient_id: "DEMO-001" },
        {
          onSuccess: () => showToast("success", "Demo analysis complete"),
          onError: (err) => showToast("error", "Demo analysis failed", messageForError(err)),
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const result = screening.data;
  const abnormalBeats = result?.beats.filter((b) => b.label === "V" || b.label === "S") ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left panel: input */}
      <Card>
        <CardHeader>
          <CardTitle>Signal Input</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="paste">Paste</TabsTrigger>
              <TabsTrigger value="demo">Generate demo</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
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
                className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? "border-ecg-accent bg-ecg-accent/5" : "border-ecg-border"
                }`}
              >
                <UploadCloud className="h-8 w-8 mx-auto text-ecg-muted mb-2" />
                <p className="text-sm text-ecg-muted">
                  Drag & drop a .csv or .txt file, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </TabsContent>

            <TabsContent value="paste">
              <Textarea
                rows={6}
                placeholder="0.12, -0.03, 0.45, 1.02, ..."
                onChange={(e) => handlePaste(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="demo">
              <div className="text-center py-4">
                <Button variant="secondary" onClick={handleGenerateDemo}>
                  <Wand2 className="h-4 w-4" />
                  Generate synthetic ECG (60 BPM, 10s)
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {signal.length > 0 && (
            <p className="text-xs text-ecg-muted mt-3">
              {signal.length} samples parsed
              {parseWarnings.length > 0 && (
                <span className="text-ecg-warning ml-2">
                  {parseWarnings.join(" ")}
                </span>
              )}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Sample rate (Hz)</Label>
              <Input
                type="number"
                min={100}
                max={1000}
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Patient ID (optional)</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. P-1024"
                maxLength={64}
              />
            </div>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleSubmit}
            disabled={screening.isPending || signal.length < 360}
          >
            {screening.isPending ? "Analysing..." : "Analyse ECG"}
          </Button>
        </CardContent>
      </Card>

      {/* Right panel: results */}
      <div className="space-y-4">
        {!result && !screening.isPending && (
          <Card>
            <CardContent className="text-sm text-ecg-muted text-center py-16">
              Results will appear here after you run an analysis.
            </CardContent>
          </Card>
        )}

        {screening.isPending && (
          <Card>
            <CardContent className="space-y-3 py-6">
              <div className="skeleton h-48 rounded-lg" />
              <div className="skeleton h-6 w-1/2 rounded-lg" />
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {abnormalBeats.length > 0 && (
              <div className="rounded-lg bg-ecg-danger/10 border border-ecg-danger text-ecg-danger px-4 py-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {abnormalBeats.length} abnormal beat{abnormalBeats.length !== 1 ? "s" : ""} detected (
                {((abnormalBeats.length / result.total_beats) * 100).toFixed(1)}% of total)
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>ECG Waveform</CardTitle>
              </CardHeader>
              <CardContent>
                <ECGWaveform
                  signal={signal}
                  sampleRate={result.sample_rate}
                  beats={result.beats}
                  highlightedBeatIndex={selectedBeat}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {(["N", "S", "V", "F", "Q"] as const).map((l) => (
                    <LabelBadge key={l} label={l} count={result.label_summary[l]} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Beat timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <BeatTimeline
                  beats={result.beats}
                  selectedIndex={selectedBeat}
                  onSelect={setSelectedBeat}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Beat detail</CardTitle>
              </CardHeader>
              <CardContent>
                <BeatTable beats={result.beats} onRowClick={setSelectedBeat} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid grid-cols-4 gap-4 py-4 text-center text-xs">
                <div>
                  <p className="text-ecg-muted">Preprocessing</p>
                  <p className="font-semibold text-white">{result.preprocessing_duration_ms.toFixed(0)} ms</p>
                </div>
                <div>
                  <p className="text-ecg-muted">Inference</p>
                  <p className="font-semibold text-white">{result.inference_duration_ms.toFixed(0)} ms</p>
                </div>
                <div>
                  <p className="text-ecg-muted">Total beats</p>
                  <p className="font-semibold text-white">{result.total_beats}</p>
                </div>
                <div>
                  <p className="text-ecg-muted">Duration</p>
                  <p className="font-semibold text-white">
                    {(result.signal_length_samples / result.sample_rate).toFixed(1)}s
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
