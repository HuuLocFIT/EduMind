import { apiClient } from "./api-client.service.js";
import {
  LessonListResponseSchema,
  type LessonListResponse,
} from "@edumind/shared-types";
import { LESSON_ENDPOINTS } from "@edumind/shared-utils";

const parseLessonList = (payload: unknown): LessonListResponse =>
  LessonListResponseSchema.parse(payload);

export const lessonService = {
  /**
   * Get all lessons for a course, ordered by section and lesson order
   */
  async getCourseLessons(courseId: number | string): Promise<LessonListResponse> {
    const response = await apiClient.get<LessonListResponse>(
      LESSON_ENDPOINTS.COURSE(courseId)
    );
    return parseLessonList(response.data);
  },

  /**
   * Get all lessons for a section, ordered by lesson order
   */
  async getSectionLessons(sectionId: number | string): Promise<LessonListResponse> {
    const response = await apiClient.get<LessonListResponse>(
      LESSON_ENDPOINTS.SECTION(sectionId)
    );
    return parseLessonList(response.data);
  },
};

export type LessonService = typeof lessonService;

