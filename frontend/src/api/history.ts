import { apiClient, API_BASE_URL } from "./client";
import type { HistoryQueryParams, PaginatedResponse, ScreeningResult } from "./types";

export async function fetchHistory(
  params: HistoryQueryParams
): Promise<PaginatedResponse<ScreeningResult>> {
  const { data } = await apiClient.get<PaginatedResponse<ScreeningResult>>(
    `${API_BASE_URL}/history`,
    { params }
  );
  return data;
}
