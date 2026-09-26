import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "@/api/history";
import type { HistoryQueryParams } from "@/api/types";

export function useHistory(params: HistoryQueryParams) {
  return useQuery({
    queryKey: ["history", params],
    queryFn: () => fetchHistory(params),
    placeholderData: (prev) => prev,
  });
}
