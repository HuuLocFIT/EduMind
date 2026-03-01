import { apiClient } from "./api-client.service.js";
import {
  CourseDetailResponseSchema,
  InstructorStatsResponseSchema,
  CoursePagedResponseSchema,
  type CourseDetailResponse,
  type CourseResponse,
  type InstructorStatsResponse,
  type PagedResponse,
  type CoursePagedResponse,
} from "@edumind/shared-types";
import { COURSE_ENDPOINTS } from "@edumind/shared-utils";

export interface CoursePaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}

export interface CourseSearchParams extends CoursePaginationParams {
  keyword?: string;
}

export interface CourseFilterParams extends CoursePaginationParams {
  categoryIds?: number[];
  levels?: string[];
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  minRating?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}

const parseCourseDetail = (payload: unknown): CourseDetailResponse =>
  CourseDetailResponseSchema.parse(payload);

const parseCoursePagedResponse = (payload: unknown): CoursePagedResponse =>
  CoursePagedResponseSchema.parse(payload) as CoursePagedResponse;

const parseInstructorStats = (payload: unknown): InstructorStatsResponse =>
  InstructorStatsResponseSchema.parse(payload);

export const courseService = {
  async getCourseById(courseId: number | string): Promise<CourseDetailResponse> {
    const response = await apiClient.get<CourseDetailResponse>(
      COURSE_ENDPOINTS.DETAIL(courseId)
    );
    return parseCourseDetail(response.data);
  },

  async getCourseBySlug(slug: string): Promise<CourseDetailResponse> {
    const response = await apiClient.get<CourseDetailResponse>(
      COURSE_ENDPOINTS.DETAIL_BY_SLUG(slug)
    );
    return parseCourseDetail(response.data);
  },

  async searchCourses(params: CourseSearchParams = {}): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.SEARCH,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async filterCourses(params: CourseFilterParams = {}): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.FILTER,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getCoursesByCategory(
    categoryId: number | string,
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.BY_CATEGORY(categoryId),
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getCoursesByInstructor(
    instructorId: number | string,
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.BY_INSTRUCTOR(instructorId),
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getTopRatedCourses(
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.TOP_RATED,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getMostPopularCourses(
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.MOST_POPULAR,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getNewestCourses(
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.NEWEST,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getFreeCourses(
    params: CoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      COURSE_ENDPOINTS.FREE,
      { params }
    );
    return parseCoursePagedResponse(response.data);
  },

  async getInstructorStats(
    instructorId: number | string
  ): Promise<InstructorStatsResponse> {
    const response = await apiClient.get<InstructorStatsResponse>(
      COURSE_ENDPOINTS.INSTRUCTOR_STATS(instructorId)
    );
    return parseInstructorStats(response.data);
  },
};

export type CourseService = typeof courseService;

