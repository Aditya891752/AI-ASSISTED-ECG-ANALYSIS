import { create } from "zustand";

export type ModelOption = {
  id: string;
  label: string;
  modelPath: string;
  classes: string[];
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "mitbih",
    label: "MIT-BIH (5-class)",
    modelPath: "model/model.pkl",
    classes: ["N", "S", "V", "F", "Q"],
  },
  {
    id: "ptbdb",
    label: "PTBDB (MI Detection)",
    modelPath: "model/model_ptbdb_rf.pkl",
    classes: ["NORMAL", "ABNORMAL"],
  },
  {
    id: "combined",
    label: "Combined (Recommended)",
    modelPath: "model/model_combined_rf.pkl",
    classes: ["N", "S", "V", "F", "Q", "ABNORMAL"],
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
