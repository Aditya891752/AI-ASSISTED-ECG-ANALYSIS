import { useMutation, useQuery } from "@tanstack/react-query";
import { submitBatch, fetchJobStatus } from "@/api/batch";
import type { BatchScreeningRequest } from "@/api/types";

export function useSubmitBatch() {
  return useMutation({
    mutationFn: (payload: BatchScreeningRequest) => submitBatch(payload),
  });
}

export function useBatchJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });
}
