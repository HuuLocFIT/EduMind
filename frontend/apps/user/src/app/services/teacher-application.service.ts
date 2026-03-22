import { apiClient } from "./api-client.service.js";
import {
  type TeacherApplicationRequest,
  type TeacherApplicationResponse,
  type TrialStatusResponse,
  type MessageResponse,
  TeacherApplicationResponseSchema,
  TrialStatusResponseSchema,
} from "@edumind/shared-types";
import { TEACHER_APPLICATION_ENDPOINTS } from "@edumind/shared-utils";

export const teacherApplicationService = {
  /**
   * Submit teacher application
   * POST /teacher-application/submit
   * Access: STUDENT or GUEST
   */
  async submitApplication(
    data: TeacherApplicationRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      TEACHER_APPLICATION_ENDPOINTS.SUBMIT,
      data
    );
    return response.data;
  },

  /**
   * Get my application status
   * GET /teacher-application/my-application
   * Access: Authenticated user
   */
  async getMyApplication(): Promise<TeacherApplicationResponse | null> {
    try {
      const response = await apiClient.get(
        TEACHER_APPLICATION_ENDPOINTS.MY_APPLICATION
      );
      // When no application exists, the backend returns data: null.
      // unwrapApiResponse converts that to a message shape { message, status, success },
      // which is truthy but not a valid TeacherApplicationResponse.
      // safeParse handles both cases: returns parsed data if valid, null otherwise.
      const parsed = TeacherApplicationResponseSchema.safeParse(response.data);
      return parsed.success ? parsed.data : null;
    } catch (error: any) {
      if (error.status === 404 || error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Check if trial expired
   * GET /teacher-application/trial-status
   * Access: TEACHER_TRIAL
   */
  async getTrialStatus(): Promise<TrialStatusResponse> {
    const response = await apiClient.get<TrialStatusResponse>(
      TEACHER_APPLICATION_ENDPOINTS.TRIAL_STATUS
    );
    return TrialStatusResponseSchema.parse(response.data);
  }
}

export type TeacherApplicationService = typeof teacherApplicationService;

