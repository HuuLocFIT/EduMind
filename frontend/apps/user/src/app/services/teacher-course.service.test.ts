import { beforeEach, describe, expect, it, vi } from 'vitest';
import { teacherCourseService } from './teacher-course.service';

vi.mock('./api-client.service.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@edumind/shared-utils', () => ({
  ENROLLMENT_ENDPOINTS: {
    DETAIL: (enrollmentId: string | number) => `/api/enrollments/${enrollmentId}`,
    SUSPEND: (enrollmentId: string | number) => `/api/enrollments/${enrollmentId}/suspend`,
    ACTIVATE: (enrollmentId: string | number) => `/api/enrollments/${enrollmentId}/activate`,
    REPORT_TO_ADMIN: (enrollmentId: string | number) => `/api/enrollments/${enrollmentId}/report-to-admin`,
  },
  TEACHER_PORTAL_ENDPOINTS: {
    MY_STATS: (instructorId: string | number) =>
      `/api/courses/instructors/${instructorId}/stats`,
    MY_COURSES: (instructorId: string | number) =>
      `/api/courses/instructor/${instructorId}`,
    COURSE_PICKER: (instructorId: string | number) =>
      `/api/courses/instructor/${instructorId}/picker`,
    COURSE_CREATE: '/api/courses',
    COURSE_UPDATE: (courseId: string | number) => `/api/courses/${courseId}`,
    COURSE_ARCHIVE: (courseId: string | number) => `/api/courses/${courseId}/archive`,
    COURSE_DETAIL: (courseId: string | number) => `/api/courses/${courseId}`,
    COURSE_PUBLISH: (courseId: string | number) => `/api/courses/${courseId}/publish`,
    SECTIONS: (courseId: string | number) => `/api/sections/courses/${courseId}`,
    SECTIONS_DETAIL: (courseId: string | number) => `/api/sections/courses/${courseId}/detail`,
    SECTION_CREATE: (courseId: string | number) => `/api/sections/courses/${courseId}`,
    SECTION_UPDATE: (sectionId: string | number) => `/api/sections/${sectionId}`,
    SECTION_DELETE: (sectionId: string | number) => `/api/sections/${sectionId}`,
    SECTION_REORDER: (courseId: string | number) => `/api/sections/courses/${courseId}/reorder`,
    LESSONS: (sectionId: string | number) => `/api/lessons/sections/${sectionId}`,
    LESSON_CREATE: (sectionId: string | number) => `/api/lessons/sections/${sectionId}`,
    LESSON_UPDATE: (lessonId: string | number) => `/api/lessons/${lessonId}`,
    LESSON_DELETE: (lessonId: string | number) => `/api/lessons/${lessonId}`,
    LESSON_REORDER: (sectionId: string | number) => `/api/lessons/sections/${sectionId}/reorder`,
    LESSON_VIDEO_SIGNATURE: (lessonId: string | number) => `/api/lessons/${lessonId}/video/signature`,
    LESSON_VIDEO_CONFIRM: (lessonId: string | number) => `/api/lessons/${lessonId}/video`,
    LESSON_VIDEO_DELETE: (lessonId: string | number) => `/api/lessons/${lessonId}/video`,
    LESSON_VIDEO_RESET: (lessonId: string | number) => `/api/lessons/${lessonId}/video/reset`,
    COURSE_STUDENTS: (courseId: string | number) => `/api/enrollments/courses/${courseId}`,
    COURSE_REVIEWS: (courseId: string | number) => `/api/reviews/courses/${courseId}/all`,
  },
  INSTRUCTOR_REVIEW_ENDPOINTS: {
    MY_REVIEWS: '/api/reviews/instructor/my-reviews',
    MY_REVIEWS_STATS: '/api/reviews/instructor/my-reviews/stats',
    MY_REVIEWS_COURSES: '/api/reviews/instructor/my-reviews/courses',
    REPLY: (reviewId: number) => `/api/reviews/${reviewId}/reply`,
    DELETE_REPLY: (reviewId: number) => `/api/reviews/${reviewId}/reply`,
  },
}));

import { apiClient } from './api-client.service.js';

const pickerFixture = [
  { id: 1, title: 'Course One' },
  { id: 2, title: 'Course Two' },
];

describe('teacherCourseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCoursePicker', () => {
    it('hits the course picker endpoint for the instructor and returns the parsed id/title list', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: pickerFixture });

      const result = await teacherCourseService.getCoursePicker(42);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/courses/instructor/42/picker'
      );
      expect(result).toEqual([
        { id: 1, title: 'Course One' },
        { id: 2, title: 'Course Two' },
      ]);
    });

    it('returns an empty list when the endpoint responds with no courses', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const result = await teacherCourseService.getCoursePicker(42);

      expect(result).toEqual([]);
    });
  });

  describe('archiveCourse', () => {
    it('archives a course with a trimmed optional reason and parses the response', async () => {
      const archivedCourse = {
        id: 1,
        title: 'Course One',
        slug: 'course-one',
        status: 'ARCHIVED',
        instructorId: 42,
        instructorName: 'Teacher',
        categoryId: 2,
        categoryName: 'Technology',
        level: 'BEGINNER',
        language: 'English',
        price: 0,
        currency: 'USD',
        hasCertificate: false,
        hasSubtitles: false,
        createdAt: '2026-08-20T00:00:00Z',
        updatedAt: '2026-08-21T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: archivedCourse });

      const result = await teacherCourseService.archiveCourse(1, '  Outdated  ');

      expect(apiClient.post).toHaveBeenCalledWith('/api/courses/1/archive', {
        reason: 'Outdated',
      });
      expect(result.status).toBe('ARCHIVED');
    });
  });
});
