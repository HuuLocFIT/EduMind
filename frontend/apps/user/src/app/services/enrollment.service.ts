import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  EnrollRequestSchema,
  EnrollmentResponseSchema,
  EnrollmentStatsResponseSchema,
  EnrollmentListSchema,
  EnrollmentPagedResponseSchema,
  type EnrollRequest,
  type EnrollmentResponse,
  type EnrollmentStatsResponse,
  type PagedResponse,
  type EnrollmentPagedResponse,
} from "@edumind/shared-types";
import { ENROLLMENT_ENDPOINTS } from "@edumind/shared-utils";

export interface EnrollmentQueryParams {
  status?: string;
  page?: number;
  size?: number;
}

const parseEnrollment = (payload: unknown): EnrollmentResponse =>
  EnrollmentResponseSchema.parse(payload);

const parseEnrollmentList = (payload: unknown): EnrollmentResponse[] =>
  EnrollmentListSchema.parse(payload);

const parseEnrollmentPagedResponse = (
  payload: unknown
): EnrollmentPagedResponse =>
  EnrollmentPagedResponseSchema.parse(payload) as EnrollmentPagedResponse;

export const enrollmentService = {
  async enrollInCourse(courseId: number | string): Promise<EnrollmentResponse> {
    const payload: EnrollRequest = EnrollRequestSchema.parse({
      courseId: Number(courseId),
    });

    const response = await apiClient.post<EnrollmentResponse>(
      ENROLLMENT_ENDPOINTS.BASE,
      payload
    );

    return parseEnrollment(response.data);
  },

  async getEnrollmentById(
    enrollmentId: number | string
  ): Promise<EnrollmentResponse> {
    const response = await apiClient.get<EnrollmentResponse>(
      ENROLLMENT_ENDPOINTS.DETAIL(enrollmentId)
    );
    return parseEnrollment(response.data);
  },

  async getMyEnrollments(
    params: EnrollmentQueryParams = {}
  ): Promise<PagedResponse<EnrollmentResponse>> {
    const response = await apiClient.get<EnrollmentPagedResponse>(
      ENROLLMENT_ENDPOINTS.MINE,
      { params }
    );
    return parseEnrollmentPagedResponse(response.data);
  },

  async getMyCompletedCourses(): Promise<EnrollmentResponse[]> {
    const response = await apiClient.get<EnrollmentResponse[]>(
      ENROLLMENT_ENDPOINTS.MY_COMPLETED
    );
    return parseEnrollmentList(response.data);
  },

  async getMyInProgressCourses(
    minProgress?: number
  ): Promise<EnrollmentResponse[]> {
    const response = await apiClient.get<EnrollmentResponse[]>(
      ENROLLMENT_ENDPOINTS.MY_IN_PROGRESS,
      { params: minProgress !== undefined ? { minProgress } : undefined }
    );
    return parseEnrollmentList(response.data);
  },

  async getRecentlyAccessedCourses(limit?: number): Promise<EnrollmentResponse[]> {
    const response = await apiClient.get<EnrollmentResponse[]>(
      ENROLLMENT_ENDPOINTS.MY_RECENT,
      { params: limit ? { limit } : undefined }
    );
    return parseEnrollmentList(response.data);
  },

  async checkEnrollmentStatus(courseId: number | string): Promise<boolean> {
    const response = await apiClient.get<boolean>(
      ENROLLMENT_ENDPOINTS.CHECK(courseId)
    );
    return z.boolean().parse(response.data);
  },

  async getMyEnrollmentForCourse(courseId: number | string): Promise<EnrollmentResponse | null> {
    try {
      const response = await apiClient.get(ENROLLMENT_ENDPOINTS.MY_FOR_COURSE(courseId));
      return parseEnrollment(response.data);
    } catch (error: any) {
      if (error.status === 404 || error.response?.status === 404) return null;
      throw error;
    }
  },

  async getMyEnrollmentStats(): Promise<EnrollmentStatsResponse> {
    const response = await apiClient.get<EnrollmentStatsResponse>(
      ENROLLMENT_ENDPOINTS.MY_STATS
    );
    return EnrollmentStatsResponseSchema.parse(response.data);
  },
};

export type EnrollmentService = typeof enrollmentService;
