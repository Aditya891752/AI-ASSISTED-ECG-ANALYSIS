import { useMutation } from "@tanstack/react-query";
import { submitScreening } from "@/api/screening";
import type { ScreeningRequest } from "@/api/types";

export function useScreening() {
  return useMutation({
    mutationFn: (payload: ScreeningRequest) => submitScreening(payload),
  });
}
