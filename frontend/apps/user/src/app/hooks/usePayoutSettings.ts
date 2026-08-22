import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { payoutService } from "../services/payout.service";
import { queryKeys } from "../lib/query-keys";
import type { PayoutSettings } from "@edumind/shared-types";

export const usePayoutSettings = () => {
  return useQuery<PayoutSettings>({
    queryKey: queryKeys.payouts.settings,
    queryFn: () => payoutService.getPayoutSettings(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdatePayoutSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PayoutSettings) => payoutService.updatePayoutSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.payouts.settings, data);
    },
    onError: (err) => {
      Sentry.captureException(err, { tags: { mutation: "updatePayoutSettings" } });
    },
  });
};

