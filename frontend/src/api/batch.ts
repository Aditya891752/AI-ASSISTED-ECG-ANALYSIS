import { apiClient, API_BASE_URL } from "./client";
import type { BatchScreeningRequest, JobResponse, JobDetailResponse } from "./types";

export async function submitBatch(
  payload: BatchScreeningRequest
): Promise<JobResponse> {
  const { data } = await apiClient.post<JobResponse>(
    `${API_BASE_URL}/screen/batch`,
    payload
  );
  return data;
}

export async function fetchJobStatus(jobId: string): Promise<JobDetailResponse> {
  const { data } = await apiClient.get<JobDetailResponse>(
    `${API_BASE_URL}/jobs/${jobId}`
  );
  return data;
}
