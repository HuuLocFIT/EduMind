import { apiClient } from "./api-client.service.js";
import {
  EarningResponseSchema,
  EarningsSummaryResponseSchema,
  MonthlyEarningResponseSchema,
  CourseEarningResponseSchema,
  type EarningResponse,
  type EarningsSummaryResponse,
  type MonthlyEarningResponse,
  type CourseEarningResponse,
  type PagedResponse,
} from "@edumind/shared-types";
import { EarningStatus } from "@edumind/shared-constants";
import { EARNING_ENDPOINTS } from "@edumind/shared-utils";
import { z } from "zod";

export interface EarningPaginationParams {
  status?: EarningStatus;
  courseId?: number;
  fromDate?: string; // ISO date format
  toDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface EarningSummaryParams {
  fromDate?: string;
  toDate?: string;
}

export interface EarningExportParams {
  fromDate?: string;
  toDate?: string;
  status?: EarningStatus;
}

const parseEarningResponse = (payload: unknown): EarningResponse =>
  EarningResponseSchema.parse(payload);

const parseEarningsSummary = (payload: unknown): EarningsSummaryResponse =>
  EarningsSummaryResponseSchema.parse(payload);

const parseMonthlyEarnings = (payload: unknown): MonthlyEarningResponse[] =>
  z.array(MonthlyEarningResponseSchema).parse(payload);

const parseCourseEarnings = (payload: unknown): CourseEarningResponse[] => {
  if (payload === null || payload === undefined) return [];
  return z.array(CourseEarningResponseSchema).parse(payload);
};

export const earningService = {
  /**
   * Get instructor's earnings (paginated)
   */
  async getMyEarnings(
    params: EarningPaginationParams = {}
  ): Promise<PagedResponse<EarningResponse>> {
    const response = await apiClient.get<PagedResponse<EarningResponse>>(
      EARNING_ENDPOINTS.BASE,
      { params }
    );
    return response.data!;
  },

  /**
   * Get earning detail by ID
   */
  async getEarningById(earningId: number): Promise<EarningResponse> {
    const response = await apiClient.get<EarningResponse>(
      EARNING_ENDPOINTS.DETAIL(earningId)
    );
    return parseEarningResponse(response.data);
  },

  /**
   * Get earnings summary/statistics
   */
  async getEarningsSummary(
    params: EarningSummaryParams = {}
  ): Promise<EarningsSummaryResponse> {
    const response = await apiClient.get<EarningsSummaryResponse>(
      EARNING_ENDPOINTS.SUMMARY,
      { params }
    );
    return parseEarningsSummary(response.data);
  },

  /**
   * Get monthly earnings summary
   */
  async getMonthlyEarnings(months: number = 12): Promise<MonthlyEarningResponse[]> {
    const response = await apiClient.get<MonthlyEarningResponse[]>(
      EARNING_ENDPOINTS.MONTHLY,
      { params: { months } }
    );
    return parseMonthlyEarnings(response.data);
  },

  /**
   * Get earnings grouped by course
   */
  async getEarningsByCourse(
    params: EarningSummaryParams = {}
  ): Promise<CourseEarningResponse[]> {
    const response = await apiClient.get<CourseEarningResponse[]>(
      EARNING_ENDPOINTS.BY_COURSE,
      { params }
    );
    return parseCourseEarnings(response.data);
  },

  /**
   * Export earnings to CSV
   */
  async exportEarningsCsv(params: EarningExportParams = {}): Promise<Blob> {
    const response = await apiClient.get(EARNING_ENDPOINTS.EXPORT, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Get export URL for direct download
   */
  getExportUrl(params: EarningExportParams = {}): string {
    const searchParams = new URLSearchParams();
    if (params.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params.toDate) searchParams.set("toDate", params.toDate);
    if (params.status) searchParams.set("status", params.status);
    const queryString = searchParams.toString();
    return queryString
      ? `${EARNING_ENDPOINTS.EXPORT}?${queryString}`
      : EARNING_ENDPOINTS.EXPORT;
  },
};

export type EarningService = typeof earningService;
