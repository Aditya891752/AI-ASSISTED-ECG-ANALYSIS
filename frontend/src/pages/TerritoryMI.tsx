import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Activity,
  Heart,
  CheckCircle2,
  ShieldAlert,
  Printer,
  Share2,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface TerritoryDetail {
  title: string;
  culpritPill: string;
  culpritClass: string;
  sub: string;
  elevation: string;
  leadLabel: string;
  leadStatus: string;
  path: string;
  caliperY: string;
  caliperText: string;
}

const territoryData: Record<string, TerritoryDetail> = {
  anteroseptal: {
    title: "Anteroseptal (V1–V4)",
    culpritPill: "CULPRIT 94.8%",
    culpritClass: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    sub: "Vessel: LAD (Left Anterior Descending)",
    elevation: "+0.32 mV",
    leadLabel: "Lead V2 • Calibration 10mm/mV",
    leadStatus: "TOMBSTONE MORPHOLOGY DETECTED",
    path: "M 0 50 L 30 50 Q 38 45, 45 50 L 60 50 L 65 56 L 72 10 L 80 68 L 86 32 C 105 28, 135 34, 155 50 L 190 50 Q 198 45, 205 50 L 220 50 L 225 56 L 232 10 L 240 68 L 246 32 C 265 28, 295 34, 315 50 L 350 50 Q 358 45, 365 50 L 380 50 L 385 56 L 392 10 L 400 68",
    caliperY: "32",
    caliperText: "J-PT: +0.32mV",
  },
  septal: {
    title: "Septal (V1, V2)",
    culpritPill: "CRITICAL 91.2%",
    culpritClass: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    sub: "Vessel: Proximal LAD (First Septal Perforator)",
    elevation: "+0.32 mV",
    leadLabel: "Lead V1 • Calibration 10mm/mV",
    leadStatus: "ACUTE J-POINT ELEVATION",
    path: "M 0 50 L 30 50 Q 38 47, 45 50 L 60 50 L 66 54 L 72 15 L 80 65 L 86 34 C 105 30, 135 36, 155 50 L 190 50 Q 198 47, 205 50 L 220 50 L 226 54 L 232 15 L 240 65 L 246 34 C 265 30, 295 36, 315 50 L 350 50",
    caliperY: "34",
    caliperText: "J-PT: +0.32mV",
  },
  anterior: {
    title: "Anterior (V3, V4)",
    culpritPill: "ELEVATED 88.4%",
    culpritClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    sub: "Vessel: Mid LAD (Diagonal Branches)",
    elevation: "+0.28 mV",
    leadLabel: "Lead V3 • Calibration 10mm/mV",
    leadStatus: "CONVEX ST MORPHOLOGY",
    path: "M 0 50 L 30 50 Q 38 46, 45 50 L 60 50 L 65 54 L 72 12 L 80 62 L 86 36 C 105 32, 135 38, 155 50 L 190 50 Q 198 46, 205 50 L 220 50 L 225 54 L 232 12 L 240 62 L 246 36 C 265 32, 295 38, 315 50 L 350 50",
    caliperY: "36",
    caliperText: "J-PT: +0.28mV",
  },
  lateral: {
    title: "Lateral (I, aVL, V5, V6)",
    culpritPill: "RECIPROCAL DEPRESSION",
    culpritClass: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    sub: "Vessel: LCx (Left Circumflex Artery)",
    elevation: "-0.08 mV",
    leadLabel: "Lead aVL • Calibration 10mm/mV",
    leadStatus: "RECIPROCAL INVERSION",
    path: "M 0 50 L 30 50 Q 38 48, 45 50 L 60 50 L 66 52 L 72 20 L 80 55 L 86 54 C 105 58, 135 54, 155 50 L 190 50 Q 198 48, 205 50 L 220 50 L 226 52 L 232 20 L 240 55 L 246 54 C 265 58, 295 54, 315 50 L 350 50",
    caliperY: "54",
    caliperText: "J-PT: -0.08mV",
  },
  inferior: {
    title: "Inferior (II, III, aVF)",
    culpritPill: "STABLE BASELINE",
    culpritClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    sub: "Vessel: RCA (Right Coronary Artery)",
    elevation: "0.00 mV",
    leadLabel: "Lead II • Calibration 10mm/mV",
    leadStatus: "PHYSIOLOGICAL NORMAL",
    path: "M 0 50 L 30 50 Q 38 46, 45 50 L 60 50 L 66 52 L 72 22 L 78 54 L 84 50 C 95 44, 115 44, 130 50 L 190 50 Q 198 46, 205 50 L 220 50 L 226 52 L 232 22 L 238 54 L 244 50 C 255 44, 275 44, 290 50 L 350 50",
    caliperY: "50",
    caliperText: "J-PT: 0.00mV",
  },
};

export function TerritoryMI() {
  const [activeLeadMode, setActiveLeadMode] = useState<"12" | "2">("12");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("anteroseptal");
  const [cathLabDispatched, setCathLabDispatched] = useState<boolean>(false);

  const active = territoryData[selectedTerritory] || territoryData.anteroseptal;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Heart className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                CARDIO AI
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono text-emerald-400">CLINICAL WORKSTATION</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Territorial MI Coronary Localization
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                MAX30001 • 360Hz
              </span>
            </h1>
          </div>
        </div>

        {/* Acquisition Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-mono text-slate-400 px-2">Mode:</span>
          <button
            onClick={() => setActiveLeadMode("12")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeLeadMode === "12"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            12-Lead Full (Spatial)
          </button>
          <button
            onClick={() => setActiveLeadMode("2")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeLeadMode === "2"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            2-Lead Frontal (Degraded)
          </button>
        </div>
      </div>

      {/* Dynamic Alert Banner */}
      {activeLeadMode === "12" ? (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-rose-400 uppercase tracking-tight font-mono">
                Active Transmural Infarction Alert
              </span>
              <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold">
                LAD MID-SEGMENT OCCLUSION
              </span>
            </div>
            <p className="text-xs text-slate-200">
              Precordial V1–V4 vectors confirm acute transmural occlusion with tombstone ST-elevation. Vector projection localization active at 94.8% AI confidence.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-slate-900 border border-amber-500/40 p-4 rounded-xl">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-amber-400 uppercase tracking-tight font-mono">
              &lt; 8 Leads Active: Spatial Territorial Localization Limited
            </span>
            <p className="text-xs text-slate-300">
              Territorial coronary localization requires complete precordial V1–V6 coverage. Frontal limb leads alone cannot detect localized septal/anterior wall ischemia. Switch to 12-lead mode to unlock complete coronary mapping.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Coronary Tree & Waveform Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Anatomical Coronary Tree Tomography (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Coronary Tree Tomography
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-400">LAD 94.8%</span>
            </div>
          </div>

          {/* Interactive Heart SVG */}
          <div className="relative w-full aspect-[4/3] bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
            {/* Grid Reticle */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern height="20" id="telemetry-grid-pattern" patternUnits="userSpaceOnUse" width="20">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4cd7f6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect fill="url(#telemetry-grid-pattern)" height="100%" width="100%" />
            </svg>

            <svg className="relative w-full max-w-[280px] h-full" fill="none" viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
              {/* Cardiac Myocardial Silhouette */}
              <path
                d="M150 35 C190 20, 260 55, 240 135 C225 190, 175 235, 150 250 C125 235, 75 190, 60 135 C40 55, 110 20, 150 35 Z"
                fill="#111827"
                stroke="#1f2937"
                strokeWidth="2.5"
              />
              {/* Aorta Root */}
              <path d="M135 15 C135 30, 165 30, 165 15 C165 5, 135 5, 135 15 Z" fill="#374151" />

              {/* RCA in Emerald Cyan */}
              <g className="cursor-pointer transition-opacity" onClick={() => setSelectedTerritory("inferior")}>
                <path
                  className="filter drop-shadow-[0_0_6px_rgba(78,222,163,0.5)]"
                  d="M138 38 Q100 55, 92 105 Q85 150, 112 185 Q125 200, 135 210"
                  fill="none"
                  stroke="#4edea3"
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
                <circle cx="100" cy="80" fill="#4edea3" r="3" />
                <text fill="#4edea3" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="48" y="90">
                  RCA (0.00mV)
                </text>
              </g>

              {/* LCx in Emerald Cyan */}
              <g className="cursor-pointer transition-opacity" onClick={() => setSelectedTerritory("lateral")}>
                <path
                  className="filter drop-shadow-[0_0_6px_rgba(78,222,163,0.5)]"
                  d="M162 42 Q200 50, 222 88 Q235 120, 228 150 Q222 170, 205 190"
                  fill="none"
                  stroke="#4edea3"
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
                <text fill="#4edea3" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="210" y="60">
                  LCx (-0.08)
                </text>
              </g>

              {/* LAD in Ruby Crimson (CRITICAL OCCLUSION) */}
              <g className="cursor-pointer" onClick={() => setSelectedTerritory("anteroseptal")}>
                <path d="M155 42 Q160 70, 154 95" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeWidth="5" />
                <g transform="translate(154, 95)">
                  <circle className="animate-ping" cx="0" cy="0" fill="#f43f5e" opacity="0.5" r="12" />
                  <circle cx="0" cy="0" fill="#9f1239" r="8" stroke="#ffb4ab" strokeWidth="1.5" />
                  <circle cx="0" cy="0" fill="#ffb4ab" r="3" />
                </g>
                <path
                  className="animate-pulse"
                  d="M154 95 Q145 140, 150 185 Q152 215, 150 245"
                  fill="none"
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
                {/* Diagonal Branch */}
                <path d="M156 80 Q180 110, 192 145" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeWidth="2.5" />
                {/* Occlusion Flag */}
                <g transform="translate(168, 92)">
                  <rect fill="#0a0e17" height="24" rx="4" stroke="#93000a" strokeWidth="1" width="102" x="0" y="-12" />
                  <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="6" y="2">
                    MID-LAD THROMBUS
                  </text>
                  <text fill="#dfe2ef" fontFamily="Inter" fontSize="7" x="6" y="9">
                    ST +0.32 mV V1-V4
                  </text>
                </g>
              </g>
            </svg>

            {/* Bottom floating chip */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-white">Occlusion: Proximal-to-Mid LAD</span>
              </div>
              <span className="text-cyan-400">360Hz AFE Realtime</span>
            </div>
          </div>
        </div>

        {/* Right Column: Waveform Strip & Territorial Metric Cards (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Territory Tabs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Territorial Waveform Inspection
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Sweep 25mm/s • 10mm/mV</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Object.keys(territoryData).map((key) => {
                const item = territoryData[key];
                const isSelected = selectedTerritory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTerritory(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        key === "anteroseptal" || key === "septal"
                          ? "bg-rose-500"
                          : key === "anterior"
                          ? "bg-amber-400"
                          : key === "lateral"
                          ? "bg-cyan-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Waveform Strip Card */}
          <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between p-4 bg-slate-800/40 border-b border-slate-800">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white font-mono">{active.title}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${active.culpritClass}`}>
                    {active.culpritPill}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">{active.sub}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">J-Point Shift</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    active.elevation.startsWith("+")
                      ? "text-rose-400"
                      : active.elevation.startsWith("-")
                      ? "text-slate-400"
                      : "text-emerald-400"
                  }`}
                >
                  {active.elevation}
                </span>
              </div>
            </div>

            {/* SVG Rhythm Strip */}
            <div className="relative w-full h-36 bg-slate-950 p-3 flex flex-col justify-between overflow-hidden">
              {/* Calibrated Grid */}
              <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern height="10" id="small-ecg-grid-pattern" patternUnits="userSpaceOnUse" width="10">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#06b6d4" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect fill="url(#small-ecg-grid-pattern)" height="100%" width="100%" />
              </svg>

              <div className="relative w-full h-full flex items-center">
                <svg className="w-full h-24 overflow-visible" fill="none" viewBox="0 0 400 90" xmlns="http://www.w3.org/2000/svg">
                  <line stroke="#374151" strokeDasharray="2 2" strokeWidth="1" x1="0" x2="400" y1="50" y2="50" />
                  <path d={active.path} fill="none" stroke="#06b6d4" strokeLinejoin="round" strokeWidth="2.5" />
                  <g transform={`translate(86, ${active.caliperY})`}>
                    <circle className="animate-ping" cx="0" cy="0" fill="#f43f5e" r="4" />
                    <circle cx="0" cy="0" fill="#f43f5e" r="2.5" />
                    <line stroke="#f43f5e" strokeDasharray="2 1" strokeWidth="1" x1="0" x2="0" y1="-14" y2="28" />
                    <rect fill="#0f172a" height="15" rx="3" stroke="#f43f5e" strokeWidth="0.5" width="76" x="6" y="-14" />
                    <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="9" y="-3">
                      {active.caliperText}
                    </text>
                  </g>
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>{active.leadLabel}</span>
                <span className="text-rose-400 font-bold">{active.leadStatus}</span>
              </div>
            </div>
          </div>

          {/* 5 Territorial ST Vector Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(territoryData).map((key) => {
              const item = territoryData[key];
              const isSelected = selectedTerritory === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedTerritory(key)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500 shadow-md"
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2 h-8 rounded-full ${
                        key === "anteroseptal" || key === "septal"
                          ? "bg-rose-500"
                          : key === "anterior"
                          ? "bg-amber-400"
                          : key === "lateral"
                          ? "bg-cyan-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                        {item.sub}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold font-mono ${
                        item.elevation.startsWith("+")
                          ? "text-rose-400"
                          : item.elevation.startsWith("-")
                          ? "text-slate-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {item.elevation}
                    </span>
                    <span className="text-[8px] text-slate-500 block uppercase font-mono">Shift</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Diagnostic Culprit Summary & Clinical Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Diagnostic Culprit Summary
              </span>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-bold">
                SYNTHESIS ENGINE v4.2
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-2">
              Acute Anteroseptal STEMI
            </h2>
            <span className="text-xs font-mono font-bold text-rose-400">
              Class 1 Urgent Catheterization Protocol Triggered
            </span>
          </div>

          {/* Derivation Health */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Einthoven & Goldberger Derivation Health</span>
              <span className="text-emerald-400 font-bold text-[10px]">VERIFIED</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Lead III (synthesized = II - I):</span>
              <span className="text-emerald-400 font-bold">DELTA: 0.01 mV [NOMINAL]</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Wilson Central Terminal (WCT):</span>
              <span className="text-cyan-400 font-bold">(RA+LA+LL)/3 BALANCED</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>aVR / aVL / aVF Balance:</span>
              <span className="text-emerald-400 font-bold">ZERO RESIDUAL [PASS]</span>
            </div>
          </div>
        </div>

        {/* Clinical Checklist & Cath Lab Dispatch */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Recommended Clinical Actions
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">DOOR-TO-BALLOON &lt;90m</span>
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0" />
              <span>Activate Interventional Cath Lab Suite 02</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0" />
              <span>Administer Heparin IV Bolus + DAPT Loading (Aspirin + Ticagrelor)</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0" />
              <span>Initiate High-Acuity Transfer to Regional PCI Center</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCathLabDispatched(true)}
              className={`flex-1 py-3.5 px-4 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${
                cathLabDispatched
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                  : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.4)] active:scale-98"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{cathLabDispatched ? "Cath Lab Suite Dispatched (Alert Active)" : "Dispatch Cath Lab Alarm"}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-3.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              title="Print 12-Lead Diagnostic Strip"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
