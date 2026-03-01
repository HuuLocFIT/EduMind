import { apiClient } from "./api-client.service.js";
import { TeacherAnalyticsSchema, type TeacherAnalytics } from "@edumind/shared-types";
import { TEACHER_ANALYTICS_ENDPOINTS } from "@edumind/shared-utils";

export const teacherAnalyticsService = {
  async getAnalytics(): Promise<TeacherAnalytics> {
    const response = await apiClient.get(TEACHER_ANALYTICS_ENDPOINTS.ANALYTICS);
    return TeacherAnalyticsSchema.parse(response.data);
  },
};
