import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  LessonProgressResponseSchema,
  UpdateProgressRequestSchema,
  LessonProgressListSchema,
  type LessonProgressResponse,
  type UpdateProgressRequest,
  type LessonProgressListResponse,
} from "@edumind/shared-types";
import { LESSON_PROGRESS_ENDPOINTS } from "@edumind/shared-utils";

const parseLessonProgress = (payload: unknown): LessonProgressResponse =>
  LessonProgressResponseSchema.parse(payload);

const parseLessonProgressList = (
  payload: unknown
): LessonProgressListResponse => LessonProgressListSchema.parse(payload);

export const lessonProgressService = {
  async startLesson(
    enrollmentId: number | string,
    lessonId: number | string
  ): Promise<LessonProgressResponse> {
    const response = await apiClient.post<LessonProgressResponse>(
      LESSON_PROGRESS_ENDPOINTS.START,
      undefined,
      {
        params: {
          enrollmentId,
          lessonId,
        },
      }
    );

    return parseLessonProgress(response.data);
  },

  async updateWatchProgress(
    payload: UpdateProgressRequest
  ): Promise<LessonProgressResponse> {
    const body = UpdateProgressRequestSchema.parse(payload);

    const response = await apiClient.put<LessonProgressResponse>(
      LESSON_PROGRESS_ENDPOINTS.WATCH,
      body
    );

    return parseLessonProgress(response.data);
  },

  async completeLesson(
    enrollmentId: number | string,
    lessonId: number | string
  ): Promise<LessonProgressResponse> {
    const response = await apiClient.put<LessonProgressResponse>(
      LESSON_PROGRESS_ENDPOINTS.COMPLETE,
      undefined,
      { params: { enrollmentId, lessonId } }
    );

    return parseLessonProgress(response.data);
  },

  async getEnrollmentProgress(
    enrollmentId: number | string
  ): Promise<LessonProgressListResponse> {
    const response = await apiClient.get<LessonProgressListResponse>(
      LESSON_PROGRESS_ENDPOINTS.ENROLLMENT(enrollmentId)
    );

    return parseLessonProgressList(response.data);
  },

  async getCompletedLessons(
    enrollmentId: number | string
  ): Promise<LessonProgressListResponse> {
    const response = await apiClient.get<LessonProgressListResponse>(
      LESSON_PROGRESS_ENDPOINTS.ENROLLMENT_COMPLETED(enrollmentId)
    );

    return parseLessonProgressList(response.data);
  },

  async checkLessonCompletion(
    enrollmentId: number | string,
    lessonId: number | string
  ): Promise<boolean> {
    const response = await apiClient.get<boolean>(
      LESSON_PROGRESS_ENDPOINTS.CHECK,
      {
        params: {
          enrollmentId,
          lessonId,
        },
      }
    );

    return z.boolean().parse(response.data);
  },
};

export type LessonProgressService = typeof lessonProgressService;

