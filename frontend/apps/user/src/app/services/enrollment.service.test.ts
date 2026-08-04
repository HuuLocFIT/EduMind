import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrollmentService } from './enrollment.service';

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
    BASE: '/api/enrollments',
    DETAIL: (enrollmentId: string | number) => `/api/enrollments/${enrollmentId}`,
    MINE: '/api/enrollments/my-enrollments',
    MY_COMPLETED: '/api/enrollments/my-completed',
    MY_IN_PROGRESS: '/api/enrollments/my-in-progress',
    MY_RECENT: '/api/enrollments/my-recent',
    MY_STATS: '/api/enrollments/my-stats',
    CHECK: (courseId: string | number) => `/api/enrollments/check/${courseId}`,
    MY_FOR_COURSE: (courseId: string | number) => `/api/enrollments/course/${courseId}`,
  },
}));

import { apiClient } from './api-client.service.js';

const enrollmentFixture = {
  id: 1,
  courseId: 10,
  courseTitle: 'Course',
  courseThumbnail: null,
  coursePrice: null,
  courseIsPaid: false,
  studentId: 99,
  progressPercentage: 40,
  completedLessons: 2,
  totalLessons: 5,
  status: 'ACTIVE',
  enrolledAt: '2026-03-01T10:00:00Z',
  completedAt: null,
  certificateUrl: null,
  lastAccessedAt: '2026-03-10T10:00:00Z',
  expiresAt: null,
  suspensionReason: null,
};

describe('enrollmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyInProgressCourses', () => {
    it('omits minProgress when undefined', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [enrollmentFixture] });

      await enrollmentService.getMyInProgressCourses();

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/enrollments/my-in-progress',
        { params: undefined }
      );
    });

    it('passes minProgress when 0', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [enrollmentFixture] });

      await enrollmentService.getMyInProgressCourses(0);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/enrollments/my-in-progress',
        { params: { minProgress: 0 } }
      );
    });
  });

  describe('getMyEnrollmentForCourse', () => {
    it('returns the parsed enrollment when the lookup succeeds', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: enrollmentFixture });

      const result = await enrollmentService.getMyEnrollmentForCourse(10);

      expect(apiClient.get).toHaveBeenCalledWith('/api/enrollments/course/10');
      expect(result).toMatchObject({
        id: 1,
        courseId: 10,
        status: 'ACTIVE',
      });
    });

    it('returns null when the lookup responds with 404', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({ status: 404 });

      await expect(enrollmentService.getMyEnrollmentForCourse(10)).resolves.toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({ status: 500 });

      await expect(enrollmentService.getMyEnrollmentForCourse(10)).rejects.toEqual({ status: 500 });
    });
  });
});
