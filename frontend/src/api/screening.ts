import { apiClient, API_BASE_URL } from "./client";
import type { ScreeningRequest, ScreeningResult } from "./types";

export async function submitScreening(
  payload: ScreeningRequest
): Promise<ScreeningResult> {
  const { data } = await apiClient.post<ScreeningResult>(
    `${API_BASE_URL}/screen`,
    payload
  );
  return data;
}

export async function fetchScreeningResult(
  resultId: string
): Promise<ScreeningResult> {
  const { data } = await apiClient.get<ScreeningResult>(
    `${API_BASE_URL}/history/${resultId}`
  );
  return data;
}
