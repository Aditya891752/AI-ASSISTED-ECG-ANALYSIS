import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  "/territory-mi": {
    category: "LOCALIZATION",
    title: "Territorial MI & Culprit Artery",
    desc: "12-lead coronary mapping, reciprocal ST elevation & anatomical thrombus localization",
  },
  "/accuracy": {
    category: "BENCHMARKS",
    title: "Variable Lead Accuracy Matrix",
    desc: "Dynamic 2–12 lead sensitivity/specificity tradeoff & lead derivation matrix",
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
    desc: "AI-Assisted ECG Screening System",
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
        {/* Prominent Model Switcher (MIT-BIH | PTB-XL | Combined) */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
          {MODEL_OPTIONS.map((m) => {
            const isSelected = selectedModelId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModelId(m.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                title={m.description}
              >
                <span>{m.shortLabel}</span>
                {m.badge === "Recommended" && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                      isSelected
                        ? "bg-slate-950 text-cyan-300"
                        : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    }`}
                  >
                    ★ REC
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
