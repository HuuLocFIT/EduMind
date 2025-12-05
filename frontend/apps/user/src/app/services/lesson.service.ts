import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  LessonResponseSchema,
  type LessonResponse,
} from "@edumind/shared-types";
import { LESSON_ENDPOINTS } from "@edumind/shared-utils";

const LessonListSchema = z.array(LessonResponseSchema);

const parseLessonList = (payload: unknown): LessonResponse[] =>
  LessonListSchema.parse(payload);

export const lessonService = {
  /**
   * Get all lessons for a course, ordered by section and lesson order
   */
  async getCourseLessons(courseId: number | string): Promise<LessonResponse[]> {
    const response = await apiClient.get<LessonResponse[]>(
      LESSON_ENDPOINTS.COURSE(courseId)
    );
    return parseLessonList(response.data);
  },

  /**
   * Get all lessons for a section, ordered by lesson order
   */
  async getSectionLessons(sectionId: number | string): Promise<LessonResponse[]> {
    const response = await apiClient.get<LessonResponse[]>(
      LESSON_ENDPOINTS.SECTION(sectionId)
    );
    return parseLessonList(response.data);
  },
};

export type LessonService = typeof lessonService;

