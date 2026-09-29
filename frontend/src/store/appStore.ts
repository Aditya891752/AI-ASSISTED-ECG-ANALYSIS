import { create } from "zustand";

export type ModelOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  badge?: string;
  modelPath: string;
  classes: string[];
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "mitbih",
    label: "MIT-BIH Arrhythmia",
    shortLabel: "MIT-BIH",
    description: "42k MIT-BIH beats • 5-Class AAMI Rhythm & Ectopic Screening",
    badge: "5-Class AAMI",
    modelPath: "model/model.pkl",
    classes: ["N", "S", "V", "F", "Q"],
  },
  {
    id: "ptbdb",
    label: "PTB-XL 12-Lead",
    shortLabel: "PTB-XL",
    description: "21.8k PTB-XL records • 12-Lead Multi-Channel Infarction & Ischemia",
    badge: "12-Lead MI",
    modelPath: "model/model.pkl",
    classes: ["NORM", "IMI", "ASMI", "AFIB", "PVC"],
  },
  {
    id: "combined",
    label: "Combined Dual-Engine",
    shortLabel: "Combined",
    description: "Unified 75k-beat ensemble trained on MIT-BIH + PTB-XL 12-Lead",
    badge: "Recommended",
    modelPath: "model/model.pkl",
    classes: ["N", "S", "V", "F", "Q"],
  },
];

interface AppState {
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePatientId: null,
  setActivePatientId: (id) => set({ activePatientId: id }),
  selectedModelId: MODEL_OPTIONS[2].id,
  setSelectedModelId: (id) => set({ selectedModelId: id }),
}));
