import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Heart,
  AlertTriangle,
  ArrowRight,
  Zap,
  Grid,
  Sliders,
  CheckCircle2,
  FileText,
  PauseCircle,
  PlayCircle,
  Compass,
} from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedLeadMode, setSelectedLeadMode] = useState<string>("12");
  const [oscilloscopeView, setOscilloscopeView] = useState<"matrix" | "rhythm">("matrix");
  const [calipersActive, setCalipersActive] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [inspectedBeat, setInspectedBeat] = useState<{
    num: number;
    type: string;
    conf: string;
    rr: string;
    jpt: string;
    isAbnormal: boolean;
  }>({
    num: 14,
    type: "Premature Ventricular Contraction (PVC)",
    conf: "96.2% AI Conf",
    rr: "520 ms (Short)",
    jpt: "+0.28 mV",
    isAbnormal: true,
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* 1. Patient & Hardware Telemetry Banner */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-bold text-white font-mono tracking-tight">PT #CF-8042</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">M, 58y</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              ICU-Bed 04
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-emerald-400 font-bold">38ms Latency</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/60">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">AFE Front-End</span>
            <span className="text-xs font-mono font-bold text-cyan-400">MAX30001 • AD8232</span>
          </div>
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/60">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Sampling Rate</span>
            <span className="text-xs font-mono font-bold text-white">360 Hz (16-bit)</span>
          </div>
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/60">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Signal Quality</span>
            <span className="text-xs font-mono font-bold text-emerald-400">99.4% (34.2 dB SNR)</span>
          </div>
        </div>
      </div>

      {/* 2. Critical Triage STEMI Alert Card */}
      <div className="w-full bg-rose-500/10 border-l-4 border-rose-500 border-y border-r border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            <span className="text-base font-bold text-rose-400 font-mono tracking-tight">
              ACUTE STEMI PROTOCOL TRIGGERED
            </span>
          </div>
          <span className="bg-rose-500 text-slate-950 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Priority Tier-1
          </span>
        </div>
        <p className="text-xs text-slate-200">
          Antero-Septal ST Elevation detected in Leads <span className="text-cyan-400 font-bold">V1, V2, V3</span> (+0.28 mV at J-Point+60ms). Culprit vessel localization ready for catheterization protocol.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-purple-400" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Culprit Vessel Prediction</span>
              <span className="text-xs font-mono font-bold text-purple-300">LAD Occlusion • 94.6% Confidence</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/territory-mi")}
              className="bg-cyan-500 text-slate-950 font-mono text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-cyan-400 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
            >
              <span>Territory MI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg"
              title="Print Telemetry"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Lead Mode Interactive Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 uppercase tracking-wider">Acquisition Topology & Synthesized Vector</span>
          <span className="text-cyan-400 font-bold">IEEE 12-LEAD DERIVATION</span>
        </div>
        <div className="grid grid-cols-5 gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
          {[
            { mode: "2", label: "2-Lead", sub: "Rural PHC" },
            { mode: "3", label: "3-Lead", sub: "Axis Screen" },
            { mode: "5", label: "5-Lead", sub: "Holter" },
            { mode: "8", label: "8-Lead", sub: "Precordial" },
            { mode: "12", label: "12-Lead", sub: "Hospital Cart" },
          ].map((item) => {
            const isSelected = selectedLeadMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => setSelectedLeadMode(item.mode)}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <span className="font-mono text-xs">{item.label}</span>
                <span className={`text-[9px] uppercase tracking-tighter ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-400">
          <span className="text-cyan-400 font-bold">Physical:</span>
          <span>I, II, V1–V6</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">Synthesized:</span>
          <span className="text-emerald-300">III, aVR, aVL, aVF (Einthoven's Law)</span>
        </div>
      </div>

      {/* 4. Real-time Calibrated Telemetry Readouts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Heart Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase">
            <span>Heart Rate</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse fill-current" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-emerald-400">78</span>
            <span className="text-[10px] font-mono text-slate-400">BPM</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400/80 truncate">Sinus • Conf 99%</span>
        </div>

        {/* PR Interval */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <span className="text-slate-400 text-[10px] font-mono uppercase">PR Interval</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-white">158</span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400">Normal Conduction</span>
        </div>

        {/* QRS Duration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <span className="text-slate-400 text-[10px] font-mono uppercase">QRS Duration</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-white">92</span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400">Narrow Complex</span>
        </div>

        {/* QTc Bazett */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <span className="text-slate-400 text-[10px] font-mono uppercase">QTc (Bazett)</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-white">418</span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400">&lt; 440ms Normal</span>
        </div>

        {/* Frontal Axis */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <span className="text-slate-400 text-[10px] font-mono uppercase">Frontal Axis</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-white">+54°</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400">Physiological</span>
        </div>

        {/* ST Dev V2/V3 */}
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <span className="text-rose-400 text-[10px] font-mono uppercase font-bold">ST Dev (V2/V3)</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-mono font-bold text-rose-400">+0.28</span>
            <span className="text-[10px] font-mono text-rose-400">mV</span>
          </div>
          <span className="text-[9px] font-mono text-rose-400 uppercase font-bold animate-pulse">
            Critical Elevation
          </span>
        </div>
      </div>

      {/* 5. Hero Oscilloscope Surveillance Canvas */}
      <div className="w-full bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Canvas Top Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOscilloscopeView("matrix")}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                oscilloscopeView === "matrix"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matrix 3x4 (12-Lead)</span>
            </button>
            <button
              onClick={() => setOscilloscopeView("rhythm")}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                oscilloscopeView === "rhythm"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Continuous Lead II Rhythm Strip</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalipersActive(!calipersActive)}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                calipersActive
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {calipersActive ? "Calipers: ON (Δ 200ms)" : "Calipers: OFF"}
            </button>
            <button
              onClick={() => setIsFrozen(!isFrozen)}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${
                isFrozen
                  ? "bg-rose-500 text-white border-rose-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {isFrozen ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              <span>{isFrozen ? "RESUME" : "FREEZE"}</span>
            </button>
          </div>
        </div>

        {/* Screen Area with 20px / 4px Reticle Grid */}
        <div
          className="relative w-full min-h-[380px] p-4 flex flex-col justify-between select-none"
          style={{
            backgroundColor: "#05080f",
            backgroundImage:
              "radial-gradient(rgba(76, 215, 246, 0.08) 1px, transparent 1px), radial-gradient(rgba(76, 215, 246, 0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 4px 4px",
          }}
        >
          {/* Sweep Header */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
            <span className="text-cyan-400 font-bold">BIOFORGE SYNAPSE-IV CLINICAL WORKSTATION</span>
            <span>25 mm/s • 10 mm/mV • 0.05–150 Hz</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isFrozen ? "" : "animate-pulse"}`} />
              <span>{isFrozen ? "FREEZE ACTIVE" : "SWEEP ACTIVE"}</span>
            </div>
          </div>

          {/* VIEW 1: Matrix 3x4 */}
          {oscilloscopeView === "matrix" && (
            <div className="grid grid-cols-3 grid-rows-4 gap-2 my-2 w-full h-[300px]">
              {/* I, aVR, V1 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Lead I</span>
                <svg className="w-full h-12 stroke-cyan-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,22 L38,3 L41,31 L44,18 L52,18 L58,13 L66,18 L100,18" strokeWidth="1.6" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">Lead aVR</span>
                <svg className="w-full h-12 stroke-slate-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,20 L21,18 L32,18 L35,14 L38,33 L41,7 L44,18 L52,18 L58,23 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Lead V1</span>
                <svg className="w-full h-12 stroke-cyan-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,17 L21,18 L33,18 L36,15 L39,32 L43,18 L52,18 L58,15 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>

              {/* II, aVL, V2 (STEMI!) */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400">Lead II (Rhythm)</span>
                <svg className="w-full h-12 stroke-emerald-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,15 L21,18 L32,18 L35,23 L38,1 L41,33 L44,18 L52,18 L58,11 L66,18 L100,18" strokeWidth="1.6" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">Lead aVL</span>
                <svg className="w-full h-12 stroke-slate-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,17 L21,18 L32,18 L35,20 L38,9 L41,26 L44,18 L52,18 L58,15 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 font-bold">
                  <span>Lead V2 • STEMI</span>
                  <span>+0.28mV</span>
                </div>
                <svg className="w-full h-12 stroke-rose-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L34,22 L37,2 L40,28 L43,10 L55,7 L64,13 L70,18 L100,18" strokeWidth="1.8" />
                </svg>
              </div>

              {/* III, aVF, V3 (STEMI!) */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">Lead III</span>
                <svg className="w-full h-12 stroke-slate-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,17 L21,18 L32,18 L35,21 L38,11 L41,25 L44,18 L52,18 L58,16 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">Lead aVF</span>
                <svg className="w-full h-12 stroke-slate-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,21 L38,5 L41,30 L44,18 L52,18 L58,13 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 font-bold">
                  <span>Lead V3 • STEMI</span>
                  <span>+0.25mV</span>
                </div>
                <svg className="w-full h-12 stroke-rose-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L34,20 L37,4 L40,29 L43,9 L54,6 L63,12 L70,18 L100,18" strokeWidth="1.8" />
                </svg>
              </div>

              {/* V4, V5, V6 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Lead V4</span>
                <svg className="w-full h-12 stroke-cyan-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,21 L38,4 L41,29 L44,18 L52,18 L58,12 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Lead V5</span>
                <svg className="w-full h-12 stroke-cyan-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,21 L38,3 L41,30 L44,18 L52,18 L58,13 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-400">Lead V6</span>
                <svg className="w-full h-12 stroke-cyan-400 fill-none" preserveAspectRatio="none" viewBox="0 0 100 36">
                  <path d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,20 L38,5 L41,28 L44,18 L52,18 L58,14 L66,18 L100,18" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          )}

          {/* VIEW 2: Continuous Long Rhythm Strip II */}
          {oscilloscopeView === "rhythm" && (
            <div className="relative w-full h-[300px] flex flex-col justify-center">
              <div className="relative w-full h-44 flex items-center">
                <svg className="w-full h-full stroke-emerald-400 fill-none" preserveAspectRatio="none" viewBox="0 0 600 100">
                  <path
                    d="M0,50 L30,50 L35,46 L40,50 L60,50 L64,58 L70,8 L76,82 L82,50 L98,50 L110,38 L126,50 
                       L160,50 L165,46 L170,50 L190,50 L194,58 L200,8 L206,82 L212,50 L228,50 L240,38 L256,50
                       L280,50 L290,75 L300,12 L315,92 L325,50 L345,65 L365,50 
                       L390,50 L395,46 L400,50 L420,50 L424,58 L430,8 L436,82 L442,50 L458,50 L470,38 L486,50
                       L510,50 L514,40 L519,50 L530,50 L534,56 L539,12 L544,78 L549,50 L562,50 L572,40 L585,50 L600,50"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Beat Pins */}
                <div
                  onClick={() =>
                    setInspectedBeat({
                      num: 12,
                      type: "Normal Sinus (N)",
                      conf: "99.8% AI Conf",
                      rr: "772 ms",
                      jpt: "0.00 mV",
                      isAbnormal: false,
                    })
                  }
                  className="absolute left-[11%] top-4 cursor-pointer flex flex-col items-center group"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                    N
                  </span>
                  <div className="w-px h-28 bg-emerald-500/40" />
                </div>

                <div
                  onClick={() =>
                    setInspectedBeat({
                      num: 13,
                      type: "Normal Sinus (N)",
                      conf: "99.4% AI Conf",
                      rr: "768 ms",
                      jpt: "0.00 mV",
                      isAbnormal: false,
                    })
                  }
                  className="absolute left-[33%] top-4 cursor-pointer flex flex-col items-center group"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                    N
                  </span>
                  <div className="w-px h-28 bg-emerald-500/40" />
                </div>

                {/* PVC Pin (Abnormal) */}
                <div
                  onClick={() =>
                    setInspectedBeat({
                      num: 14,
                      type: "Premature Ventricular Contraction (PVC)",
                      conf: "96.2% AI Conf",
                      rr: "520 ms (Short)",
                      jpt: "+0.28 mV",
                      isAbnormal: true,
                    })
                  }
                  className="absolute left-[50%] top-4 cursor-pointer flex flex-col items-center group"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold shadow-lg animate-pulse group-hover:scale-110 transition-transform">
                    V
                  </span>
                  <div className="w-px h-28 bg-rose-500/70" />
                </div>

                <div
                  onClick={() =>
                    setInspectedBeat({
                      num: 15,
                      type: "Compensatory Normal (N)",
                      conf: "99.1% AI Conf",
                      rr: "910 ms (Compensatory)",
                      jpt: "0.00 mV",
                      isAbnormal: false,
                    })
                  }
                  className="absolute left-[71%] top-4 cursor-pointer flex flex-col items-center group"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                    N
                  </span>
                  <div className="w-px h-28 bg-emerald-500/40" />
                </div>

                <div
                  onClick={() =>
                    setInspectedBeat({
                      num: 16,
                      type: "Premature Atrial Complex (PAC)",
                      conf: "91.7% AI Conf",
                      rr: "610 ms",
                      jpt: "+0.02 mV",
                      isAbnormal: true,
                    })
                  }
                  className="absolute left-[88%] top-4 cursor-pointer flex flex-col items-center group"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-mono text-[9px] font-bold shadow-md group-hover:scale-110 transition-transform">
                    S
                  </span>
                  <div className="w-px h-28 bg-purple-500/50" />
                </div>
              </div>

              {/* Time axis */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-2">
                <span>0.0s</span>
                <span>1.5s</span>
                <span className="text-rose-400 font-bold">3.0s (PVC Trigger)</span>
                <span>4.5s</span>
                <span>6.0s</span>
              </div>
            </div>
          )}

          {/* Caliper Measurement Overlay */}
          {calipersActive && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_#06b6d4] flex items-center justify-center">
                <span className="bg-cyan-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold -translate-y-12">
                  C1: 0ms
                </span>
              </div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_#06b6d4] flex items-center justify-center">
                <span className="bg-cyan-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold -translate-y-12">
                  C2: +200ms
                </span>
              </div>
              <div className="absolute top-1/2 left-1/3 right-1/2 h-px bg-cyan-400/80 flex items-center justify-center">
                <span className="bg-slate-900 text-cyan-300 border border-cyan-500/40 font-mono text-[9px] px-2 py-0.5 rounded -translate-y-4">
                  Δ 200 ms (5.0mm)
                </span>
              </div>
            </div>
          )}

          {/* Canvas Footer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 z-10 border-t border-slate-900 pt-1">
            <span>DSP NOTCH: 50/60Hz ACTIVE • BESSEL HIGHPASS 0.05Hz</span>
            <span className="text-cyan-400 font-bold">HRV SDNN: 42ms</span>
          </div>
        </div>
      </div>

      {/* 6. Dynamic Beat Inspection Popover Callout */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono">
              Beat #{inspectedBeat.num} Morphological Inspection
            </h3>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
              inspectedBeat.isAbnormal
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {inspectedBeat.type}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Model Confidence</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{inspectedBeat.conf}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Preceding RR Interval</span>
            <span className="text-sm font-mono font-bold text-white">{inspectedBeat.rr}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">J-Point Offset</span>
            <span
              className={`text-sm font-mono font-bold ${
                inspectedBeat.jpt.startsWith("+") ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {inspectedBeat.jpt}
            </span>
          </div>
        </div>
      </div>

      {/* 7. Hardware Calibration & Gain Controls Footer Drawer */}
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Speed</span>
            <span className="text-white font-bold">25 mm/s</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Gain</span>
            <span className="text-white font-bold">10 mm/mV</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Filter Band</span>
            <span className="text-emerald-400 font-bold">0.05–150 Hz</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/accuracy"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
          >
            Accuracy & Presets
          </Link>
          <Link
            to="/territory-mi"
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            Territory MI
          </Link>
        </div>
      </div>
    </div>
  );
}
