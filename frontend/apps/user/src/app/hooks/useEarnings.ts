import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  earningService,
  type EarningPaginationParams,
  type EarningSummaryParams,
} from "../services/earning.service";
import type {
  EarningResponse,
  EarningsSummaryResponse,
  MonthlyEarningResponse,
  CourseEarningResponse,
  PagedResponse,
} from "@edumind/shared-types";

/**
 * Fetch teacher's earnings (paginated)
 */
export const useEarnings = (params: EarningPaginationParams = {}) => {
  return useQuery<PagedResponse<EarningResponse>>({
    queryKey: queryKeys.earnings.list(params),
    queryFn: () => earningService.getMyEarnings(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Fetch earning detail by ID
 */
export const useEarning = (earningId: number, enabled = true) => {
  return useQuery<EarningResponse>({
    queryKey: queryKeys.earnings.detail(earningId),
    queryFn: () => earningService.getEarningById(earningId),
    enabled: enabled && earningId > 0,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetch earnings summary/statistics
 */
export const useEarningsSummary = (params: EarningSummaryParams = {}) => {
  return useQuery<EarningsSummaryResponse>({
    queryKey: queryKeys.earnings.summary(params),
    queryFn: () => earningService.getEarningsSummary(params),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetch monthly earnings (for charts)
 */
export const useMonthlyEarnings = (months = 12) => {
  return useQuery<MonthlyEarningResponse[]>({
    queryKey: queryKeys.earnings.monthly(months),
    queryFn: () => earningService.getMonthlyEarnings(months),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Fetch earnings grouped by course
 */
export const useEarningsByCourse = (params: EarningSummaryParams = {}) => {
  return useQuery<CourseEarningResponse[]>({
    queryKey: queryKeys.earnings.byCourse(params),
    queryFn: () => earningService.getEarningsByCourse(params),
    staleTime: 1000 * 60 * 5,
  });
};
