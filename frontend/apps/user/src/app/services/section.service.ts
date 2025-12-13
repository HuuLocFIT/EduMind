import { apiClient } from './api-client.service';
import {
  SectionListResponseSchema,
  type SectionListResponse,
} from '@edumind/shared-types';
import { SECTION_ENDPOINTS } from '@edumind/shared-utils';

const parseSectionList = (payload: unknown): SectionListResponse =>
  SectionListResponseSchema.parse(payload);

export const sectionService = {
  /**
   * Get all sections for a course, ordered by orderIndex
   */
  async getCourseSections(courseId: number | string): Promise<SectionListResponse> {
    const response = await apiClient.get<SectionListResponse>(
      SECTION_ENDPOINTS.COURSE(courseId)
    );
    return parseSectionList(response.data);
  },
};

export type SectionService = typeof sectionService;


