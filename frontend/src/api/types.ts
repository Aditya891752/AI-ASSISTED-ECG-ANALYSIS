export type BeatLabel = "N" | "S" | "V" | "F" | "Q";

export interface HealthComponent {
  status: string;
  detail?: string;
  latency_ms?: number;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "unavailable";
  version: string;
  environment: string;
  components: {
    model: HealthComponent;
    database: HealthComponent;
    redis: HealthComponent;
  };
}

export interface AccuracyPoint {
  mode: string;
  channels: number;
  accuracy: number;
  tier: string;
}

export interface MILocalization {
  available: boolean;
  status: string;
  reason?: string;
  territory?: string | null;
  elevation_detected?: boolean;
  affected_leads?: string[];
  culprit_artery?: string | null;
  max_elevation_mv?: number;
  clinical_summary?: string;
}

export interface ScreeningRequest {
  signal?: number[];
  signals?: Record<string, number[]>;
  lead_mode?: string;
  leads?: string[];
  sample_rate: number;
  patient_id?: string;
  signal_id?: string;
}

export interface LabelProbabilities {
  N: number;
  S: number;
  V: number;
  F: number;
  Q: number;
}

export interface BeatClassification {
  beat_index: number;
  r_peak_sample: number;
  r_peak_time_s: number;
  label: BeatLabel;
  confidence: number;
  probabilities: LabelProbabilities;
}

export interface LabelSummary {
  N: number;
  S: number;
  V: number;
  F: number;
  Q: number;
}

export interface ScreeningResult {
  result_id: string;
  signal_id: string;
  patient_id: string | null;
  sample_rate: number;
  signal_length_samples: number;
  total_beats: number;
  beats: BeatClassification[];
  dominant_label: BeatLabel | null;
  label_summary: LabelSummary;
  preprocessing_duration_ms: number;
  inference_duration_ms: number;
  created_at: string;

  // Variable 2–12 Lead Support
  lead_mode?: string;
  leads_analyzed?: string[];
  derived_leads?: string[];
  lead_count?: number;
  benchmark_accuracy?: number;
  clinical_tier?: string;
  mi_localization?: MILocalization | null;
  accuracy_curve?: AccuracyPoint[];
}


export interface BatchSignalInput {
  signal: number[];
  sample_rate?: number;
  patient_id?: string;
  signal_id?: string;
}

export interface BatchScreeningRequest {
  signals: BatchSignalInput[];
}

export interface JobResponse {
  job_id: string;
  status: "pending";
  total_signals: number;
  message: string;
  poll_url: string;
}

export interface JobResultSummary {
  total_beats: number;
  label_counts: LabelSummary;
  abnormal_beat_rate: number;
  signals_with_abnormal_beats: number;
  failed_signals: number;
}

export interface JobDetailResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_signals: number;
  processed_signals: number;
  failed_signals: number;
  progress_pct: number;
  error_message: string | null;
  result_summary: JobResultSummary | null;
  result_ids: string[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface HistoryQueryParams {
  page?: number;
  page_size?: number;
  patient_id?: string;
  label?: BeatLabel;
  from_dt?: string;
  to_dt?: string;
  job_id?: string;
}

export interface StreamChunk {
  samples: number[];
  sample_rate: number;
  patient_id?: string;
  sequence: number;
}

export interface StreamResult {
  beat_index: number;
  r_peak_sample: number;
  r_peak_time_s: number;
  label: BeatLabel;
  confidence: number;
  probabilities: LabelProbabilities;
  buffer_sample_offset: number;
}

export interface StreamPing {
  type: "ping";
}

export interface StreamError {
  error: string;
  sequence: number;
  detail?: string;
}

export type StreamMessage = StreamResult | StreamPing | StreamError;

export function isStreamPing(msg: StreamMessage): msg is StreamPing {
  return (msg as StreamPing).type === "ping";
}

export function isStreamError(msg: StreamMessage): msg is StreamError {
  return (msg as StreamError).error !== undefined;
}
