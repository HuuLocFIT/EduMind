import { apiClient } from './api-client.service';
import { z } from 'zod';
import {
  SectionResponseSchema,
  type SectionResponse,
} from '@edumind/shared-types';
import { SECTION_ENDPOINTS } from '@edumind/shared-utils';

const SectionListSchema = z.array(SectionResponseSchema);

const parseSectionList = (payload: unknown): SectionResponse[] =>
  SectionListSchema.parse(payload);

export const sectionService = {
  /**
   * Get all sections for a course, ordered by orderIndex
   */
  async getCourseSections(courseId: number | string): Promise<SectionResponse[]> {
    const response = await apiClient.get<SectionResponse[]>(
      SECTION_ENDPOINTS.COURSE(courseId)
    );
    return parseSectionList(response.data);
  },
};

export type SectionService = typeof sectionService;


