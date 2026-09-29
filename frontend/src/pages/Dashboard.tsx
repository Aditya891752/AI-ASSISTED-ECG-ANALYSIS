import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore, MODEL_OPTIONS } from "@/store/appStore";
import {
  Activity,
  Heart,
  AlertTriangle,
  ArrowRight,
  Zap,
  Grid,
  Sliders,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Compass,
  Volume2,
  VolumeX,
  RefreshCw,
  Bell,
  BellOff,
  Download,
  Share2,
  Layers,
  ShieldCheck,
  Cpu,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

interface PatientCase {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  bed: string;
  primaryDiagnosis: string;
  priorityTier: "Tier-1 (Stat)" | "Tier-2 (Urgent)" | "Tier-3 (Routine)";
  alertTitle: string;
  alertDesc: string;
  alertType: "critical" | "warning" | "normal";
  culpritVessel?: string;
  culpritConfidence?: string;
  vitals: {
    hr: number;
    hrStatus: string;
    bp: string;
    spo2: number;
    rr: number;
    temp: string;
    pr: number;
    qrs: number;
    qtc: number;
    axis: string;
    stDev: string;
    stDevClass: string;
  };
  leadsElevated: string[];
  leadsReciprocal: string[];
  sampleBeats: Array<{
    num: number;
    type: string;
    conf: string;
    rr: string;
    jpt: string;
    isAbnormal: boolean;
    classCode: "N" | "V" | "S" | "F" | "Q";
    probabilities: Record<string, number>;
  }>;
}

const CLINICAL_CASES: Record<string, PatientCase> = {
  "cf-8042": {
    id: "PT #CF-8042",
    name: "Harold Bennett",
    age: 58,
    sex: "M",
    bed: "ICU-Bed 04",
    primaryDiagnosis: "Acute Anteroseptal STEMI (LAD Occlusion)",
    priorityTier: "Tier-1 (Stat)",
    alertTitle: "ACUTE ANTEROSEPTAL STEMI PROTOCOL TRIGGERED",
    alertDesc:
      "Critical ST-segment elevation detected in precordial leads V1, V2, V3 (+0.28 mV at J-Point+60ms). Immediate cath lab activation and coronary revascularization protocol recommended.",
    alertType: "critical",
    culpritVessel: "LAD (Proximal Left Anterior Descending)",
    culpritConfidence: "95.8% Model Confidence",
    vitals: {
      hr: 82,
      hrStatus: "Sinus Tachycardia Tendency",
      bp: "142/92",
      spo2: 96,
      rr: 20,
      temp: "37.2",
      pr: 162,
      qrs: 96,
      qtc: 448,
      axis: "+48°",
      stDev: "+0.28 mV",
      stDevClass: "text-rose-400 font-bold",
    },
    leadsElevated: ["V1", "V2", "V3", "V4"],
    leadsReciprocal: ["II", "III", "aVF"],
    sampleBeats: [
      {
        num: 12,
        type: "Normal Sinus (N)",
        conf: "99.4%",
        rr: "732 ms",
        jpt: "+0.26 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.994, S: 0.003, V: 0.002, F: 0.001 },
      },
      {
        num: 13,
        type: "Sinus with ST Elev (N)",
        conf: "98.9%",
        rr: "736 ms",
        jpt: "+0.28 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.989, S: 0.005, V: 0.004, F: 0.002 },
      },
      {
        num: 14,
        type: "Premature Ventricular Contraction (V)",
        conf: "96.4%",
        rr: "512 ms (Early)",
        jpt: "+0.32 mV",
        isAbnormal: true,
        classCode: "V",
        probabilities: { N: 0.012, S: 0.008, V: 0.964, F: 0.016 },
      },
      {
        num: 15,
        type: "Compensatory Normal (N)",
        conf: "99.1%",
        rr: "920 ms (Pause)",
        jpt: "+0.27 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.991, S: 0.004, V: 0.003, F: 0.002 },
      },
      {
        num: 16,
        type: "Premature Atrial Complex (S)",
        conf: "92.3%",
        rr: "618 ms",
        jpt: "+0.25 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.052, S: 0.923, V: 0.015, F: 0.010 },
      },
    ],
  },

  "mi-1092": {
    id: "PT #MI-1092",
    name: "Eleanor Vance",
    age: 64,
    sex: "F",
    bed: "CCU-Bed 02",
    primaryDiagnosis: "Acute Inferior STEMI (RCA Occlusion)",
    priorityTier: "Tier-1 (Stat)",
    alertTitle: "ACUTE INFERIOR STEMI PROTOCOL TRIGGERED",
    alertDesc:
      "Tombstone ST-segment elevation detected in limb leads II, III, aVF (+0.36 mV) with prominent reciprocal depression in leads I and aVL. High risk of conduction block; RCA lesion suspected.",
    alertType: "critical",
    culpritVessel: "RCA (Right Coronary Artery)",
    culpritConfidence: "97.4% Model Confidence",
    vitals: {
      hr: 58,
      hrStatus: "Sinus Bradycardia (Ischemic)",
      bp: "106/66",
      spo2: 97,
      rr: 16,
      temp: "36.8",
      pr: 194,
      qrs: 90,
      qtc: 436,
      axis: "+112° (RAD)",
      stDev: "+0.36 mV",
      stDevClass: "text-rose-400 font-bold",
    },
    leadsElevated: ["II", "III", "aVF"],
    leadsReciprocal: ["I", "aVL"],
    sampleBeats: [
      {
        num: 8,
        type: "Bradycardic Sinus (N)",
        conf: "99.2%",
        rr: "1034 ms",
        jpt: "+0.34 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.992, S: 0.003, V: 0.003, F: 0.002 },
      },
      {
        num: 9,
        type: "Inferior ST-Elev Beat (N)",
        conf: "98.7%",
        rr: "1040 ms",
        jpt: "+0.36 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.987, S: 0.006, V: 0.004, F: 0.003 },
      },
      {
        num: 10,
        type: "Junctional Escape Beat (S)",
        conf: "91.8%",
        rr: "1120 ms (Escape)",
        jpt: "+0.32 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.061, S: 0.918, V: 0.012, F: 0.009 },
      },
      {
        num: 11,
        type: "Premature Ventricular Ectopic (V)",
        conf: "97.1%",
        rr: "620 ms",
        jpt: "+0.38 mV",
        isAbnormal: true,
        classCode: "V",
        probabilities: { N: 0.010, S: 0.008, V: 0.971, F: 0.011 },
      },
      {
        num: 12,
        type: "Post-Ectopic Recovery (N)",
        conf: "98.8%",
        rr: "1160 ms",
        jpt: "+0.35 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.988, S: 0.004, V: 0.005, F: 0.003 },
      },
    ],
  },

  "af-4410": {
    id: "PT #AF-4410",
    name: "Arthur Pendelton",
    age: 71,
    sex: "M",
    bed: "Step-Down 07",
    primaryDiagnosis: "Atrial Fibrillation with Rapid Ventricular Response (RVR)",
    priorityTier: "Tier-2 (Urgent)",
    alertTitle: "RAPID SUPRAVENTRICULAR ARRHYTHMIA WARNING",
    alertDesc:
      "Irregularly irregular ventricular response with absent discrete P-waves and high ventricular rate (>130 BPM). Patient symptomatic for palpitations; rate-control protocol active.",
    alertType: "warning",
    culpritVessel: "Supraventricular / Fibrillatory Conduction",
    culpritConfidence: "98.1% Rhythm Classification",
    vitals: {
      hr: 136,
      hrStatus: "Tachycardic RVR (>130)",
      bp: "148/96",
      spo2: 95,
      rr: 22,
      temp: "37.0",
      pr: 0,
      qrs: 88,
      qtc: 472,
      axis: "+24°",
      stDev: "-0.08 mV (Rate-dep)",
      stDevClass: "text-amber-400 font-bold",
    },
    leadsElevated: [],
    leadsReciprocal: [],
    sampleBeats: [
      {
        num: 21,
        type: "Atrial Fibrillation Beat (S)",
        conf: "96.8%",
        rr: "440 ms (Short)",
        jpt: "-0.06 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.021, S: 0.968, V: 0.008, F: 0.003 },
      },
      {
        num: 22,
        type: "Atrial Fibrillation Beat (S)",
        conf: "97.4%",
        rr: "410 ms (Short)",
        jpt: "-0.08 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.016, S: 0.974, V: 0.007, F: 0.003 },
      },
      {
        num: 23,
        type: "Aberrantly Conducted Beat (S)",
        conf: "93.2%",
        rr: "510 ms",
        jpt: "-0.05 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.045, S: 0.932, V: 0.018, F: 0.005 },
      },
      {
        num: 24,
        type: "Rapid Ventricular Beat (S)",
        conf: "98.1%",
        rr: "390 ms (Tachy)",
        jpt: "-0.09 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.010, S: 0.981, V: 0.006, F: 0.003 },
      },
      {
        num: 25,
        type: "Atrial Fibrillation Beat (S)",
        conf: "97.0%",
        rr: "460 ms",
        jpt: "-0.07 mV",
        isAbnormal: true,
        classCode: "S",
        probabilities: { N: 0.018, S: 0.970, V: 0.009, F: 0.003 },
      },
    ],
  },

  "ve-2104": {
    id: "PT #VE-2104",
    name: "Marcus Aurelius Diaz",
    age: 52,
    sex: "M",
    bed: "Telemetry 12",
    primaryDiagnosis: "Frequent Ventricular Trigeminy / PVC Burden 18%",
    priorityTier: "Tier-2 (Urgent)",
    alertTitle: "FREQUENT VENTRICULAR ECTOPY SURVEILLANCE",
    alertDesc:
      "Recurring ventricular trigeminy pattern detected (two sinus beats followed by wide-complex PVC). Total 24-hr ectopic burden 18.2%. Anti-arrhythmic response being monitored.",
    alertType: "warning",
    culpritVessel: "Right Ventricular Outflow Tract (RVOT Ectopic Focus)",
    culpritConfidence: "96.7% Morphology Match",
    vitals: {
      hr: 76,
      hrStatus: "Trigeminy Pattern Active",
      bp: "128/82",
      spo2: 98,
      rr: 17,
      temp: "36.9",
      pr: 154,
      qrs: 142,
      qtc: 432,
      axis: "-42° (LAD)",
      stDev: "+0.14 mV (Discordant)",
      stDevClass: "text-amber-400 font-bold",
    },
    leadsElevated: [],
    leadsReciprocal: [],
    sampleBeats: [
      {
        num: 31,
        type: "Normal Sinus (N)",
        conf: "99.6%",
        rr: "780 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.996, S: 0.002, V: 0.001, F: 0.001 },
      },
      {
        num: 32,
        type: "Normal Sinus (N)",
        conf: "99.4%",
        rr: "776 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.994, S: 0.003, V: 0.002, F: 0.001 },
      },
      {
        num: 33,
        type: "Trigeminy PVC (V)",
        conf: "98.6%",
        rr: "490 ms (Coupling)",
        jpt: "+0.22 mV",
        isAbnormal: true,
        classCode: "V",
        probabilities: { N: 0.006, S: 0.004, V: 0.986, F: 0.004 },
      },
      {
        num: 34,
        type: "Compensatory Normal (N)",
        conf: "99.2%",
        rr: "980 ms (Pause)",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.992, S: 0.004, V: 0.002, F: 0.002 },
      },
      {
        num: 35,
        type: "Normal Sinus (N)",
        conf: "99.5%",
        rr: "782 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.995, S: 0.002, V: 0.002, F: 0.001 },
      },
    ],
  },

  "ns-0018": {
    id: "PT #NS-0018",
    name: "Clara Oswald",
    age: 34,
    sex: "F",
    bed: "ER Bay 01",
    primaryDiagnosis: "Normal Sinus Rhythm (Physiological Baseline)",
    priorityTier: "Tier-3 (Routine)",
    alertTitle: "NORMAL SINUS RHYTHM — PHYSIOLOGICAL TRACE",
    alertDesc:
      "Stable hemodynamic tracing. Regular sinus rhythm with preserved P-QRS-T axis, physiological QT intervals, and no acute ST-T wave displacement. Routine monitoring ongoing.",
    alertType: "normal",
    culpritVessel: "Normal Electrical Conduction (No Ischemia)",
    culpritConfidence: "99.8% Physiological Match",
    vitals: {
      hr: 72,
      hrStatus: "Regular Sinus Rhythm",
      bp: "116/74",
      spo2: 99,
      rr: 15,
      temp: "36.7",
      pr: 148,
      qrs: 86,
      qtc: 404,
      axis: "+58°",
      stDev: "0.00 mV",
      stDevClass: "text-emerald-400 font-bold",
    },
    leadsElevated: [],
    leadsReciprocal: [],
    sampleBeats: [
      {
        num: 1,
        type: "Normal Sinus (N)",
        conf: "99.8%",
        rr: "833 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.998, S: 0.001, V: 0.001, F: 0.000 },
      },
      {
        num: 2,
        type: "Normal Sinus (N)",
        conf: "99.9%",
        rr: "830 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.999, S: 0.001, V: 0.000, F: 0.000 },
      },
      {
        num: 3,
        type: "Normal Sinus (N)",
        conf: "99.7%",
        rr: "836 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.997, S: 0.002, V: 0.001, F: 0.000 },
      },
      {
        num: 4,
        type: "Normal Sinus (N)",
        conf: "99.8%",
        rr: "832 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.998, S: 0.001, V: 0.001, F: 0.000 },
      },
      {
        num: 5,
        type: "Normal Sinus (N)",
        conf: "99.8%",
        rr: "834 ms",
        jpt: "0.00 mV",
        isAbnormal: false,
        classCode: "N",
        probabilities: { N: 0.998, S: 0.001, V: 0.001, F: 0.000 },
      },
    ],
  },
};

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedModelId, setSelectedModelId } = useAppStore();
  const [selectedCaseId, setSelectedCaseId] = useState<string>("cf-8042");
  const [selectedLeadMode, setSelectedLeadMode] = useState<string>("12");
  const [oscilloscopeView, setOscilloscopeView] = useState<"matrix" | "rhythm">("matrix");
  const [calipersActive, setCalipersActive] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [alarmMuted, setAlarmMuted] = useState<boolean>(false);
  const [sweepSpeed, setSweepSpeed] = useState<string>("25 mm/s");
  const [displayGain, setDisplayGain] = useState<string>("10 mm/mV");
  const [filterMode, setFilterMode] = useState<string>("0.05–150 Hz");
  const [inspectedBeatIndex, setInspectedBeatIndex] = useState<number>(2);

  const activeCase = CLINICAL_CASES[selectedCaseId] || CLINICAL_CASES["cf-8042"];
  const inspectedBeat = activeCase.sampleBeats[inspectedBeatIndex] || activeCase.sampleBeats[0];
  const activeModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);

  // Lead Active Helper based on selectedLeadMode
  const isLeadActive = (lead: string): boolean => {
    if (selectedLeadMode === "12") return true;
    if (selectedLeadMode === "8") return ["I", "II", "V1", "V2", "V3", "V4", "V5", "V6"].includes(lead);
    if (selectedLeadMode === "5") return ["I", "II", "III", "aVF", "V1"].includes(lead);
    if (selectedLeadMode === "3") return ["I", "II", "III"].includes(lead);
    if (selectedLeadMode === "2") return ["II", "V1"].includes(lead);
    return true;
  };

  const isLeadDerived = (lead: string): boolean => {
    return ["III", "aVR", "aVL", "aVF"].includes(lead) && ["8", "12"].includes(selectedLeadMode);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* 0. Primary AI Model Engine Switcher */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Active AI Diagnostic Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-white font-mono mt-0.5 flex flex-wrap items-center gap-2">
              <span>{activeModel?.label}</span>
              <span className="text-xs font-mono text-cyan-400 font-normal">
                • {activeModel?.id === "mitbih" ? "AAMI 5-Class Arrhythmia (89.2% Acc)" : activeModel?.id === "ptbdb" ? "12-Lead Diagnostic MI (97.0% Acc)" : "Arrhythmia + 12-Lead Tomographic MI (99.1% Acc)"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {activeModel?.description}
            </p>
          </div>
        </div>

        {/* 3-Button Model Switcher Buttons */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          {MODEL_OPTIONS.map((m) => {
            const isSelected = selectedModelId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModelId(m.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-xl transition-all font-mono ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold">{m.shortLabel}</span>
                  {m.badge === "Recommended" && (
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded font-extrabold ${
                        isSelected
                          ? "bg-slate-950 text-cyan-300"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }`}
                    >
                      ★ REC
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] uppercase tracking-tighter truncate max-w-[90px] sm:max-w-[120px] ${
                    isSelected ? "text-slate-900 font-semibold" : "text-slate-500"
                  }`}
                >
                  {m.id === "mitbih"
                    ? "Arrhythmia"
                    : m.id === "ptbdb"
                    ? "PTB-XL 12L"
                    : "Dual-Engine"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Surveillance Header with Live Patient Profile Switcher & Vital Signs */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl flex flex-col gap-4">
        {/* Top bar: Case selector, Patient ID, Latency badge, Alarm Mute */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Case Switcher */}
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={(e) => {
                  setSelectedCaseId(e.target.value);
                  setInspectedBeatIndex(2);
                }}
                className="bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold px-3.5 py-2 rounded-xl appearance-none pr-9 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                <option value="cf-8042">Case 1: PT #CF-8042 (Anteroseptal STEMI • LAD)</option>
                <option value="mi-1092">Case 2: PT #MI-1092 (Inferior STEMI • RCA)</option>
                <option value="af-4410">Case 3: PT #AF-4410 (Rapid AFib w/ RVR • 136 BPM)</option>
                <option value="ve-2104">Case 4: PT #VE-2104 (Ventricular Trigeminy • Frequent PVC)</option>
                <option value="ns-0018">Case 5: PT #NS-0018 (Normal Sinus Rhythm • 72 BPM)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                {activeCase.name} ({activeCase.sex}, {activeCase.age}y)
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                {activeCase.bed}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Alarm Control */}
            <button
              onClick={() => setAlarmMuted(!alarmMuted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                alarmMuted
                  ? "bg-slate-800 text-slate-400 border-slate-700"
                  : activeCase.alertType === "critical"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {alarmMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              <span>{alarmMuted ? "ALARMS SILENCED (120s)" : "AUDIBLE ALARMS ON"}</span>
            </button>

            {/* Latency Indicator */}
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 font-bold">4.2ms Multi-Lead Latency</span>
            </div>
          </div>
        </div>

        {/* Multi-Parameter Bedside Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Heart Rate */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase">
              <span>Heart Rate</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse fill-current" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span
                className={`text-3xl font-mono font-bold ${
                  activeCase.vitals.hr > 100 || activeCase.vitals.hr < 60 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {activeCase.vitals.hr}
              </span>
              <span className="text-[10px] font-mono text-slate-400">BPM</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 truncate">{activeCase.vitals.hrStatus}</span>
          </div>

          {/* Blood Pressure */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-slate-400 text-[10px] font-mono uppercase">NIBP (Sys/Dia)</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-mono font-bold text-white">{activeCase.vitals.bp}</span>
              <span className="text-[10px] font-mono text-slate-400">mmHg</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400">MAP: 98 mmHg</span>
          </div>

          {/* SpO2 */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-slate-400 text-[10px] font-mono uppercase">SpO2 (Pleth)</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-mono font-bold text-cyan-400">{activeCase.vitals.spo2}</span>
              <span className="text-[10px] font-mono text-cyan-300">%</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400">Pleth Wave High Quality</span>
          </div>

          {/* Resp Rate */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-slate-400 text-[10px] font-mono uppercase">Respiration</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-mono font-bold text-white">{activeCase.vitals.rr}</span>
              <span className="text-[10px] font-mono text-slate-400">/min</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400">Thoracic Impedance</span>
          </div>

          {/* Frontal Axis */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-slate-400 text-[10px] font-mono uppercase">Frontal QRS Axis</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-mono font-bold text-white">{activeCase.vitals.axis}</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400">Hexaxial Plane</span>
          </div>

          {/* ST Deviation */}
          <div
            className={`border rounded-2xl p-3 flex flex-col justify-between shadow-md ${
              activeCase.alertType === "critical"
                ? "bg-rose-500/10 border-rose-500/40"
                : activeCase.alertType === "warning"
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            <span className="text-[10px] font-mono uppercase font-bold text-slate-300">ST Deviation</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className={`text-2xl font-mono ${activeCase.vitals.stDevClass}`}>{activeCase.vitals.stDev}</span>
            </div>
            <span className="text-[9px] font-mono uppercase font-bold text-rose-400 animate-pulse">
              {activeCase.alertType === "critical"
                ? "Significant Elevation"
                : activeCase.alertType === "warning"
                ? "Repolarization Warning"
                : "Isoelectric Normal"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Priority STEMI & Arrhythmia Triaging Alert Banner */}
      <div
        className={`w-full p-4 rounded-3xl shadow-2xl flex flex-col gap-3 relative overflow-hidden border ${
          activeCase.alertType === "critical"
            ? "bg-rose-500/10 border-l-8 border-rose-500 border-y border-r border-rose-500/30 shadow-rose-950/50"
            : activeCase.alertType === "warning"
            ? "bg-amber-500/10 border-l-8 border-amber-500 border-y border-r border-amber-500/30"
            : "bg-emerald-500/10 border-l-8 border-emerald-500 border-y border-r border-emerald-500/30"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {activeCase.alertType === "critical" ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            ) : activeCase.alertType === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <span
              className={`text-sm sm:text-base font-extrabold font-mono tracking-tight ${
                activeCase.alertType === "critical"
                  ? "text-rose-300"
                  : activeCase.alertType === "warning"
                  ? "text-amber-300"
                  : "text-emerald-300"
              }`}
            >
              {activeCase.alertTitle}
            </span>
          </div>

          <span
            className={`font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              activeCase.alertType === "critical"
                ? "bg-rose-500 text-slate-950 shadow-[0_0_10px_#ef4444]"
                : activeCase.alertType === "warning"
                ? "bg-amber-500 text-slate-950"
                : "bg-emerald-500 text-slate-950"
            }`}
          >
            {activeCase.priorityTier}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed">{activeCase.alertDesc}</p>

        {activeCase.culpritVessel && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 rounded-2xl p-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <Compass className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">AI Culprit Vessel Localization</span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {activeCase.culpritVessel} • {activeCase.culpritConfidence}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/territory-mi")}
                className="bg-cyan-500 text-slate-950 font-mono text-xs font-bold px-3.5 py-1.5 rounded-xl hover:bg-cyan-400 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all"
              >
                <span>Territory MI Tomography</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate("/accuracy")}
                className="bg-slate-800 text-slate-200 font-mono text-xs font-bold px-3.5 py-1.5 rounded-xl hover:bg-slate-700 transition-all border border-slate-700"
              >
                <span>Accuracy Curve</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Variable Lead Acquisition Switcher & Synthesized Channel Matrix */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 uppercase tracking-wider font-semibold">
            Variable Lead Acquisition Topology & Synthesized Vector
          </span>
          <span className="text-cyan-400 font-bold">EINTHOVEN & GOLDBERGER ENGINE ACTIVE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
          {[
            { mode: "2", label: "2-Lead", sub: "Rural PHC / II+V1", channels: "II, V1" },
            { mode: "3", label: "3-Lead", sub: "Axis Screening", channels: "I, II, III" },
            { mode: "5", label: "5-Lead", sub: "Holter Surveillance", channels: "I, II, III, aVF, V1" },
            { mode: "8", label: "8-Lead", sub: "Precordial Minimum", channels: "I, II, V1–V6" },
            { mode: "12", label: "12-Lead", sub: "Hospital Standard", channels: "Full 12 Leads" },
          ].map((item) => {
            const isSelected = selectedLeadMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => setSelectedLeadMode(item.mode)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
                }`}
              >
                <span className="font-mono text-xs">{item.label}</span>
                <span className={`text-[9px] uppercase tracking-tighter ${isSelected ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                  {item.sub}
                </span>
                <span className={`text-[8px] font-mono mt-0.5 ${isSelected ? "text-slate-950" : "text-cyan-400/80"}`}>
                  {item.channels}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">Physical Inputs:</span>
            <span className="text-slate-200">
              {selectedLeadMode === "2"
                ? "II, V1"
                : selectedLeadMode === "3"
                ? "I, II"
                : selectedLeadMode === "5"
                ? "I, II, V1"
                : "I, II, V1, V2, V3, V4, V5, V6"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">Derived via Math:</span>
            <span className="text-emerald-300">
              {["8", "12"].includes(selectedLeadMode)
                ? "III = II - I • aVR, aVL, aVF (Goldberger)"
                : selectedLeadMode === "5"
                ? "III = II - I • aVF = II - I/2"
                : selectedLeadMode === "3"
                ? "III = II - I"
                : "None (Direct Single/Dual Lead)"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Hero Oscilloscope Surveillance Canvas */}
      <div className="w-full bg-slate-950 rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Oscilloscope Header Control Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOscilloscopeView("matrix")}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                oscilloscopeView === "matrix"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matrix 3x4 (12-Lead)</span>
            </button>
            <button
              onClick={() => setOscilloscopeView("rhythm")}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                oscilloscopeView === "rhythm"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Continuous Lead II Strip</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalipersActive(!calipersActive)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all ${
                calipersActive
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_#06b6d4]"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {calipersActive ? "Calipers: ACTIVE (Δ 200ms)" : "Calipers: OFF"}
            </button>

            <button
              onClick={() => setIsFrozen(!isFrozen)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                isFrozen
                  ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_#ef4444]"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {isFrozen ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              <span>{isFrozen ? "RESUME SWEEP" : "FREEZE SWEEP"}</span>
            </button>
          </div>
        </div>

        {/* Screen Area with Calibrated Reticle Grid */}
        <div
          className="relative w-full min-h-[440px] p-4 flex flex-col justify-between select-none overflow-hidden"
          style={{
            backgroundColor: "#05080f",
            backgroundImage:
              "radial-gradient(rgba(76, 215, 246, 0.08) 1px, transparent 1px), radial-gradient(rgba(76, 215, 246, 0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 4px 4px",
          }}
        >
          {/* Sweep Status Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 z-10">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">CARDIO AI CLINICAL WORKSTATION</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-bold">{activeCase.id}</span>
            </div>
            <span>
              {sweepSpeed} • {displayGain} • {filterMode}
            </span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isFrozen ? "" : "animate-pulse"}`} />
              <span className="font-bold">{isFrozen ? "FREEZE ACTIVE" : "REAL-TIME SWEEP"}</span>
            </div>
          </div>

          {/* VIEW 1: Matrix 3x4 (12-Lead View) */}
          {oscilloscopeView === "matrix" && (
            <div className="grid grid-cols-3 grid-rows-4 gap-2.5 my-3 w-full h-[360px]">
              {[
                { lead: "I", stroke: "stroke-cyan-400" },
                { lead: "aVR", stroke: "stroke-slate-400" },
                { lead: "V1", stroke: activeCase.leadsElevated.includes("V1") ? "stroke-rose-400" : "stroke-cyan-400" },

                { lead: "II", stroke: activeCase.leadsElevated.includes("II") ? "stroke-rose-400" : "stroke-emerald-400" },
                { lead: "aVL", stroke: activeCase.leadsReciprocal.includes("aVL") ? "stroke-amber-400" : "stroke-slate-400" },
                { lead: "V2", stroke: activeCase.leadsElevated.includes("V2") ? "stroke-rose-400" : "stroke-cyan-400" },

                { lead: "III", stroke: activeCase.leadsElevated.includes("III") ? "stroke-rose-400" : "stroke-slate-400" },
                { lead: "aVF", stroke: activeCase.leadsElevated.includes("aVF") ? "stroke-rose-400" : "stroke-slate-400" },
                { lead: "V3", stroke: activeCase.leadsElevated.includes("V3") ? "stroke-rose-400" : "stroke-cyan-400" },

                { lead: "V4", stroke: activeCase.leadsElevated.includes("V4") ? "stroke-rose-400" : "stroke-cyan-400" },
                { lead: "V5", stroke: activeCase.leadsElevated.includes("V5") ? "stroke-rose-400" : "stroke-cyan-400" },
                { lead: "V6", stroke: "stroke-cyan-400" },
              ].map(({ lead, stroke }) => {
                const active = isLeadActive(lead);
                const derived = isLeadDerived(lead);
                const isElevated = activeCase.leadsElevated.includes(lead);
                const isReciprocal = activeCase.leadsReciprocal.includes(lead);

                return (
                  <div
                    key={lead}
                    className={`rounded-xl p-2.5 flex flex-col justify-between transition-all ${
                      !active
                        ? "bg-slate-950/40 border border-slate-900 opacity-30"
                        : isElevated
                        ? "bg-rose-500/10 border border-rose-500/50 shadow-md shadow-rose-950/40"
                        : isReciprocal
                        ? "bg-amber-500/10 border border-amber-500/40"
                        : "bg-slate-900/50 border border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isElevated ? "text-rose-400" : active ? "text-slate-200" : "text-slate-600"}`}>
                          Lead {lead}
                        </span>
                        {derived && active && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            DERIVED
                          </span>
                        )}
                      </div>

                      {isElevated ? (
                        <span className="text-rose-400 font-bold animate-pulse text-[9px]">ST ELEV (+0.28mV)</span>
                      ) : isReciprocal ? (
                        <span className="text-amber-400 font-bold text-[9px]">RECIPROCAL DEP</span>
                      ) : !active ? (
                        <span className="text-slate-600 text-[9px]">INACTIVE TIER</span>
                      ) : null}
                    </div>

                    {/* SVG Waveform Rendering */}
                    <svg className={`w-full h-12 fill-none ${active ? stroke : "stroke-slate-700"}`} preserveAspectRatio="none" viewBox="0 0 100 36">
                      {isElevated ? (
                        // ST Elevated wave pattern
                        <path
                          d="M0,18 L15,18 L18,16 L21,18 L32,18 L34,22 L37,2 L40,28 L43,9 L54,6 L63,12 L70,18 L100,18"
                          strokeWidth="1.8"
                        />
                      ) : isReciprocal ? (
                        // ST Depressed wave pattern
                        <path
                          d="M0,18 L15,18 L18,19 L21,18 L32,18 L35,21 L38,4 L41,30 L44,24 L52,24 L58,16 L66,18 L100,18"
                          strokeWidth="1.5"
                        />
                      ) : lead === "aVR" ? (
                        // Inverted normal wave for aVR
                        <path
                          d="M0,18 L15,18 L18,20 L21,18 L32,18 L35,14 L38,33 L41,7 L44,18 L52,18 L58,23 L66,18 L100,18"
                          strokeWidth="1.5"
                        />
                      ) : (
                        // Standard physiological QRS wave
                        <path
                          d="M0,18 L15,18 L18,16 L21,18 L32,18 L35,22 L38,3 L41,31 L44,18 L52,18 L58,13 L66,18 L100,18"
                          strokeWidth="1.6"
                        />
                      )}
                    </svg>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: Continuous Long Rhythm Strip II */}
          {oscilloscopeView === "rhythm" && (
            <div className="relative w-full h-[360px] flex flex-col justify-center">
              <div className="relative w-full h-48 flex items-center">
                <svg className="w-full h-full stroke-emerald-400 fill-none" preserveAspectRatio="none" viewBox="0 0 600 100">
                  <path
                    d="M0,50 L30,50 L35,46 L40,50 L60,50 L64,58 L70,8 L76,82 L82,50 L98,50 L110,38 L126,50 
                       L160,50 L165,46 L170,50 L190,50 L194,58 L200,8 L206,82 L212,50 L228,50 L240,38 L256,50
                       L280,50 L290,75 L300,12 L315,92 L325,50 L345,65 L365,50 
                       L390,50 L395,46 L400,50 L420,50 L424,58 L430,8 L436,82 L442,50 L458,50 L470,38 L486,50
                       L510,50 L514,40 L519,50 L530,50 L534,56 L539,12 L544,78 L549,50 L562,50 L572,40 L585,50 L600,50"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Interactive Beat Pins */}
                {activeCase.sampleBeats.map((beat, idx) => {
                  const leftPercentages = ["12%", "32%", "50%", "70%", "88%"];
                  const isSelected = inspectedBeatIndex === idx;

                  return (
                    <div
                      key={beat.num}
                      onClick={() => setInspectedBeatIndex(idx)}
                      style={{ left: leftPercentages[idx] }}
                      className="absolute top-2 cursor-pointer flex flex-col items-center group transition-transform"
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shadow-lg transition-transform ${
                          isSelected ? "scale-125 ring-2 ring-white" : "group-hover:scale-110"
                        } ${
                          beat.classCode === "V"
                            ? "bg-rose-500 text-white animate-pulse"
                            : beat.classCode === "S"
                            ? "bg-purple-500 text-white"
                            : "bg-emerald-500 text-slate-950"
                        }`}
                      >
                        {beat.classCode}
                      </span>
                      <div
                        className={`w-px h-32 transition-all ${
                          beat.classCode === "V"
                            ? "bg-rose-500/70"
                            : beat.classCode === "S"
                            ? "bg-purple-500/60"
                            : "bg-emerald-500/40"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Time axis */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-3">
                <span>0.0s (Sweep Start)</span>
                <span>1.5s</span>
                <span className="text-cyan-400 font-bold">3.0s (Target Complex)</span>
                <span>4.5s</span>
                <span>6.0s (Window Edge)</span>
              </div>
            </div>
          )}

          {/* Caliper Measurement Overlay */}
          {calipersActive && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_#06b6d4] flex items-center justify-center">
                <span className="bg-cyan-500 text-slate-950 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold -translate-y-16">
                  C1: 0ms
                </span>
              </div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_#06b6d4] flex items-center justify-center">
                <span className="bg-cyan-500 text-slate-950 font-mono text-[9px] px-2 py-0.5 rounded-md font-bold -translate-y-16">
                  C2: +200ms
                </span>
              </div>
              <div className="absolute top-1/2 left-1/3 right-1/2 h-px bg-cyan-400/80 flex items-center justify-center">
                <span className="bg-slate-900 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] px-2.5 py-0.5 rounded -translate-y-5">
                  Δ 200 ms (5.0 mm • Calibrated)
                </span>
              </div>
            </div>
          )}

          {/* Canvas Footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 z-10 border-t border-slate-900 pt-2">
            <span className="text-slate-400">
              DSP PIPELINE: BESSEL HIGHPASS 0.05Hz • CHEBYSHEV NOTCH 50/60Hz ACTIVE
            </span>
            <span className="text-cyan-400 font-bold">HRV SDNN: 44.8ms • P-P SNR: 34.2 dB</span>
          </div>
        </div>
      </div>

      {/* 5. Dynamic Beat Morphological Inspection Callout */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-mono">
              Beat #{inspectedBeat.num} Fiducial & Probability Decomposition
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Click any beat marker above to inspect</span>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                inspectedBeat.isAbnormal
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {inspectedBeat.type}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Model Confidence</span>
            <span className="text-lg font-mono font-bold text-cyan-400">{inspectedBeat.conf}</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Coupling Interval (RR)</span>
            <span className="text-lg font-mono font-bold text-white">{inspectedBeat.rr}</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">J-Point Offset</span>
            <span
              className={`text-lg font-mono font-bold ${
                inspectedBeat.jpt.startsWith("+") && inspectedBeat.jpt !== "+0.00 mV"
                  ? "text-rose-400"
                  : "text-emerald-400"
              }`}
            >
              {inspectedBeat.jpt}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">AAMI EC57 Class</span>
            <span className="text-lg font-mono font-bold text-purple-400">Class {inspectedBeat.classCode}</span>
          </div>
        </div>

        {/* Probability Distribution Bar */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            AAMI Posterior Class Probability Distribution (PTB-XL + MIT-BIH Trained)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(inspectedBeat.probabilities).map(([cls, prob]) => (
              <div key={cls} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-300">Class {cls}</span>
                  <span className="text-cyan-400">{(prob * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cls === inspectedBeat.classCode ? "bg-cyan-400" : "bg-slate-600"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, prob * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Hardware Calibration & Operational Controls Drawer */}
      <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Speed / Gain / Filter Settings */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Sweep Speed</span>
            <div className="flex items-center gap-1 mt-0.5">
              {["12.5 mm/s", "25 mm/s", "50 mm/s"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSweepSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sweepSpeed === s ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Gain Calibration</span>
            <div className="flex items-center gap-1 mt-0.5">
              {["5 mm/mV", "10 mm/mV", "20 mm/mV"].map((g) => (
                <button
                  key={g}
                  onClick={() => setDisplayGain(g)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    displayGain === g ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Diagnostic Bandpass Filter</span>
            <div className="flex items-center gap-1 mt-0.5">
              {["0.05–150 Hz", "0.5–40 Hz (Monitor)"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    filterMode === f ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Navigation Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/accuracy"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Accuracy Matrix & Presets</span>
          </Link>

          <Link
            to="/territory-mi"
            className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2"
          >
            <Heart className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Territory MI Tomography</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
