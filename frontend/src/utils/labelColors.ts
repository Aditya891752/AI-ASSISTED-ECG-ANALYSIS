import type { BeatLabel } from "@/api/types";

export const LABEL_COLORS: Record<string, string> = {
  N: "#10b981",
  S: "#f59e0b",
  V: "#ef4444",
  F: "#8b5cf6",
  Q: "#6b7280",
  ABNORMAL: "#ef4444",
  NORMAL: "#10b981",
};

export const LABEL_NAMES: Record<string, string> = {
  N: "Normal",
  S: "Supraventricular",
  V: "Ventricular / PVC",
  F: "Fusion",
  Q: "Unknown / paced",
  ABNORMAL: "MI / cardiac disease",
  NORMAL: "Normal",
};

export function colorForLabel(label: string): string {
  return LABEL_COLORS[label] ?? "#6b7280";
}

export function nameForLabel(label: string): string {
  return LABEL_NAMES[label] ?? label;
}

export const ALL_LABELS: BeatLabel[] = ["N", "S", "V", "F", "Q"];
