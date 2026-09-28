import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Activity, FileText, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { useAppStore, MODEL_OPTIONS } from "@/store/appStore";

const PAGE_CONFIG: Record<string, { category: string; title: string; desc: string }> = {
  "/": {
    category: "SURVEILLANCE",
    title: "Clinical Command Center",
    desc: "Real-time population arrhythmia telemetry & classification throughput",
  },
  "/screen": {
    category: "DIAGNOSTICS",
    title: "Single ECG Screening",
    desc: "High-resolution fiducial wave segmentation & 5-class AAMI rhythm triaging",
  },
  "/stream": {
    category: "TELEMETRY",
    title: "Real-Time WebSocket Stream",
    desc: "360 Hz beat-by-beat continuous physiological monitoring & alert triggers",
  },
  "/batch": {
    category: "HIGH-THROUGHPUT",
    title: "Batch Multi-Patient Queue",
    desc: "Asynchronous processing of multi-hour clinical Holter recordings",
  },
  "/history": {
    category: "AUDIT TRAIL",
    title: "Diagnostic History & Verification",
    desc: "Complete physician audit log with time-series classifications and exports",
  },
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedModelId, setSelectedModelId } = useAppStore();
  const config = PAGE_CONFIG[location.pathname] ?? {
    category: "SYSTEM",
    title: "Cardio AI Workstation",
    desc: "PS-03 AI-Assisted ECG Screening System",
  };
  const activeModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#070d1a]/80 px-6 py-3.5 backdrop-blur-2xl">
      {/* Left: Breadcrumbs & Page Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-cyan-400">
          <span>{config.category}</span>
          <ChevronRight className="h-3 w-3 text-slate-500" />
          <span className="text-slate-400 font-semibold">{config.title}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <h1 className="text-lg font-extrabold tracking-tight text-white">
            {config.title}
          </h1>
          {activeModel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              <Zap className="h-3 w-3 text-cyan-400" />
              {activeModel.label}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Lead & Sampling Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs">
          <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-mono font-medium">Lead II</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400 font-mono font-semibold">360 Hz</span>
        </div>

        {/* Model Selector */}
        <div className="w-52">
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.1] text-xs font-semibold rounded-xl text-slate-200 hover:border-cyan-500/40 focus:ring-cyan-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0c152a] border-white/[0.1] text-slate-200 rounded-xl shadow-2xl">
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs font-medium focus:bg-cyan-500/20 focus:text-cyan-300">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Slide Deck Link */}
        <a
          href="/presentation.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.1] transition-all"
          title="Open HEALTHNOVA 2026 Presentation Slides"
        >
          <FileText className="h-3.5 w-3.5 text-cyan-400" />
          <span>Deck</span>
        </a>

        {/* Demo Mode Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/screen?demo=1")}
          className="h-9 px-3.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Run Demo ECG</span>
        </Button>
      </div>
    </header>
  );
}
