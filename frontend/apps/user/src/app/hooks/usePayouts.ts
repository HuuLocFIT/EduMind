import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { payoutService, type PayoutPaginationParams } from "../services/payout.service";
import type { PayoutResponse, PayoutSummaryResponse, PagedResponse } from "@edumind/shared-types";

export const usePayouts = (params: PayoutPaginationParams = {}) => {
  return useQuery<PagedResponse<PayoutResponse>>({
    queryKey: queryKeys.payouts.list(params),
    queryFn: () => payoutService.getMyPayouts(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const usePayout = (payoutId: number, enabled = true) => {
  return useQuery<PayoutResponse>({
    queryKey: queryKeys.payouts.detail(payoutId),
    queryFn: () => payoutService.getPayoutById(payoutId),
    enabled: enabled && payoutId > 0,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePayoutSummary = () => {
  return useQuery<PayoutSummaryResponse>({
    queryKey: queryKeys.payouts.summary,
    queryFn: () => payoutService.getPayoutSummary(),
    staleTime: 1000 * 60 * 5,
  });
};
