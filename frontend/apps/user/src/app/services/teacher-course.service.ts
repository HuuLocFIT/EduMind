import { z } from "zod";
import { apiClient } from "./api-client.service";
import {
  CourseResponseSchema,
  CourseDetailResponseSchema,
  InstructorStatsResponseSchema,
  SectionResponseSchema,
  SectionDetailResponseSchema,
  LessonResponseSchema,
  EnrollmentResponseSchema,
  ReviewResponseSchema,
  createPagedResponseSchema,
  type CourseResponse,
  type CourseDetailResponse,
  type InstructorStatsResponse,
  type SectionResponse,
  type SectionDetailResponse,
  type LessonResponse,
  type EnrollmentResponse,
  type ReviewResponse,
  type PagedResponse,
  type CreateCourseRequest,
  type UpdateCourseRequest,
  type CreateSectionRequest,
  type UpdateSectionRequest,
  type CreateLessonRequest,
  type UpdateLessonRequest,
  type ReorderSectionsRequest,
  type ReorderLessonsRequest,
} from "@edumind/shared-types";
import { TEACHER_PORTAL_ENDPOINTS } from "@edumind/shared-utils";

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const CoursePagedResponseSchema = createPagedResponseSchema(CourseResponseSchema);
const SectionListResponseSchema = z.array(SectionResponseSchema);
const SectionDetailListResponseSchema = z.array(SectionDetailResponseSchema);
const LessonListResponseSchema = z.array(LessonResponseSchema);
const EnrollmentPagedResponseSchema = createPagedResponseSchema(EnrollmentResponseSchema);
const ReviewPagedResponseSchema = createPagedResponseSchema(ReviewResponseSchema);

// ============================================================================
// TYPES
// ============================================================================

type CoursePagedResponse = z.infer<typeof CoursePagedResponseSchema> & PagedResponse<CourseResponse>;
type EnrollmentPagedResponse = z.infer<typeof EnrollmentPagedResponseSchema> & PagedResponse<EnrollmentResponse>;
type ReviewPagedResponse = z.infer<typeof ReviewPagedResponseSchema> & PagedResponse<ReviewResponse>;

export interface TeacherCoursePaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}

// ============================================================================
// SERVICE
// ============================================================================

export const teacherCourseService = {
  // ==========================================================================
  // STATS
  // ==========================================================================
  
  async getMyStats(instructorId: number): Promise<InstructorStatsResponse> {
    const response = await apiClient.get<InstructorStatsResponse>(
      TEACHER_PORTAL_ENDPOINTS.MY_STATS(instructorId)
    );
    return InstructorStatsResponseSchema.parse(response.data);
  },

  // ==========================================================================
  // COURSES
  // ==========================================================================

  async getMyCourses(
    instructorId: number,
    params: TeacherCoursePaginationParams = {}
  ): Promise<PagedResponse<CourseResponse>> {
    const response = await apiClient.get<CoursePagedResponse>(
      TEACHER_PORTAL_ENDPOINTS.MY_COURSES(instructorId),
      { params }
    );
    return CoursePagedResponseSchema.parse(response.data) as CoursePagedResponse;
  },

  async getCourseDetail(courseId: number): Promise<CourseDetailResponse> {
    const response = await apiClient.get<CourseDetailResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_DETAIL(courseId)
    );
    return CourseDetailResponseSchema.parse(response.data);
  },

  async createCourse(data: CreateCourseRequest): Promise<CourseResponse> {
    const response = await apiClient.post<CourseResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_CREATE,
      data
    );
    return CourseResponseSchema.parse(response.data);
  },

  async updateCourse(
    courseId: number,
    data: UpdateCourseRequest
  ): Promise<CourseResponse> {
    const response = await apiClient.put<CourseResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_UPDATE(courseId),
      data
    );
    return CourseResponseSchema.parse(response.data);
  },

  async deleteCourse(courseId: number): Promise<void> {
    await apiClient.delete(TEACHER_PORTAL_ENDPOINTS.COURSE_DELETE(courseId));
  },

  async publishCourse(courseId: number): Promise<CourseResponse> {
    const response = await apiClient.post<CourseResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_PUBLISH(courseId)
    );
    return CourseResponseSchema.parse(response.data);
  },

  // ==========================================================================
  // SECTIONS
  // ==========================================================================

  async getCourseSections(courseId: number): Promise<SectionResponse[]> {
    const response = await apiClient.get<SectionResponse[]>(
      TEACHER_PORTAL_ENDPOINTS.SECTIONS(courseId)
    );
    return SectionListResponseSchema.parse(response.data);
  },

  async getCourseSectionsWithLessons(courseId: number): Promise<SectionDetailResponse[]> {
    const response = await apiClient.get<SectionDetailResponse[]>(
      TEACHER_PORTAL_ENDPOINTS.SECTIONS_DETAIL(courseId)
    );
    return SectionDetailListResponseSchema.parse(response.data);
  },

  async createSection(
    courseId: number,
    data: CreateSectionRequest
  ): Promise<SectionResponse> {
    const response = await apiClient.post<SectionResponse>(
      TEACHER_PORTAL_ENDPOINTS.SECTION_CREATE(courseId),
      data
    );
    return SectionResponseSchema.parse(response.data);
  },

  async updateSection(
    sectionId: number,
    data: UpdateSectionRequest
  ): Promise<SectionResponse> {
    const response = await apiClient.put<SectionResponse>(
      TEACHER_PORTAL_ENDPOINTS.SECTION_UPDATE(sectionId),
      data
    );
    return SectionResponseSchema.parse(response.data);
  },

  async deleteSection(sectionId: number): Promise<void> {
    await apiClient.delete(TEACHER_PORTAL_ENDPOINTS.SECTION_DELETE(sectionId));
  },

  async reorderSections(
    courseId: number,
    data: ReorderSectionsRequest
  ): Promise<void> {
    await apiClient.put(
      TEACHER_PORTAL_ENDPOINTS.SECTION_REORDER(courseId),
      data
    );
  },

  // ==========================================================================
  // LESSONS
  // ==========================================================================

  async getSectionLessons(sectionId: number): Promise<LessonResponse[]> {
    const response = await apiClient.get<LessonResponse[]>(
      TEACHER_PORTAL_ENDPOINTS.LESSONS(sectionId)
    );
    return LessonListResponseSchema.parse(response.data);
  },

  async createLesson(
    sectionId: number,
    data: CreateLessonRequest
  ): Promise<LessonResponse> {
    const response = await apiClient.post<LessonResponse>(
      TEACHER_PORTAL_ENDPOINTS.LESSON_CREATE(sectionId),
      data
    );
    return LessonResponseSchema.parse(response.data);
  },

  async updateLesson(
    lessonId: number,
    data: UpdateLessonRequest
  ): Promise<LessonResponse> {
    const response = await apiClient.put<LessonResponse>(
      TEACHER_PORTAL_ENDPOINTS.LESSON_UPDATE(lessonId),
      data
    );
    return LessonResponseSchema.parse(response.data);
  },

  async deleteLesson(lessonId: number): Promise<void> {
    await apiClient.delete(TEACHER_PORTAL_ENDPOINTS.LESSON_DELETE(lessonId));
  },

  async reorderLessons(
    sectionId: number,
    data: ReorderLessonsRequest
  ): Promise<void> {
    await apiClient.put(
      TEACHER_PORTAL_ENDPOINTS.LESSON_REORDER(sectionId),
      data
    );
  },

  // ==========================================================================
  // STUDENTS (Enrollments)
  // ==========================================================================

  async getCourseStudents(
    courseId: number,
    params: TeacherCoursePaginationParams = {}
  ): Promise<PagedResponse<EnrollmentResponse>> {
    const response = await apiClient.get<EnrollmentPagedResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_STUDENTS(courseId),
      { params }
    );
    return EnrollmentPagedResponseSchema.parse(response.data) as EnrollmentPagedResponse;
  },

  // ==========================================================================
  // REVIEWS
  // ==========================================================================

  async getCourseReviews(
    courseId: number,
    params: TeacherCoursePaginationParams = {}
  ): Promise<PagedResponse<ReviewResponse>> {
    const response = await apiClient.get<ReviewPagedResponse>(
      TEACHER_PORTAL_ENDPOINTS.COURSE_REVIEWS(courseId),
      { params }
    );
    return ReviewPagedResponseSchema.parse(response.data) as ReviewPagedResponse;
  },
};

export type TeacherCourseService = typeof teacherCourseService;
export default teacherCourseService;
