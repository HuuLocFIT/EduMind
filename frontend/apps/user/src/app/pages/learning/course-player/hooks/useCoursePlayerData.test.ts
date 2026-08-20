import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  CourseDetailResponse,
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { ContentType, EnrollmentStatus } from '@edumind/shared-constants';
import { useCoursePlayerData } from './useCoursePlayerData';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../../../services/course.service', () => ({
  courseService: { getCourseBySlug: vi.fn() },
}));
vi.mock('../../../../services/section.service', () => ({
  sectionService: { getCourseSections: vi.fn() },
}));
vi.mock('../../../../services/lesson.service', () => ({
  lessonService: { getCourseLessons: vi.fn() },
}));
vi.mock('../../../../services/enrollment.service', () => ({
  enrollmentService: {
    getMyEnrollmentForCourse: vi.fn(),
  },
}));
vi.mock('../../../../services/lesson-progress.service', () => ({
  lessonProgressService: {
    startLesson: vi.fn(),
    getEnrollmentProgress: vi.fn(),
  },
}));

import { courseService } from '../../../../services/course.service';
import { sectionService } from '../../../../services/section.service';
import { lessonService } from '../../../../services/lesson.service';
import { enrollmentService } from '../../../../services/enrollment.service';
import { lessonProgressService } from '../../../../services/lesson-progress.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sections = [{ id: 10, title: 'Introduction', orderIndex: 0 }] as SectionResponse[];

const courseA = {
  id: 100,
  title: 'Course A',
  slug: 'course-a',
} as CourseDetailResponse;

const courseB = {
  id: 200,
  title: 'Course B',
  slug: 'course-b',
} as CourseDetailResponse;

const lessonA1 = {
  id: 1,
  sectionId: 10,
  title: 'Lesson A1',
  contentType: ContentType.VIDEO,
  orderIndex: 0,
} as LessonResponse;

const lessonB1 = {
  id: 2,
  sectionId: 10,
  title: 'Lesson B1',
  contentType: ContentType.VIDEO,
  orderIndex: 0,
} as LessonResponse;

const enrollmentA = {
  id: 50,
  courseId: 100,
  courseTitle: 'Course A',
  courseSlug: 'course-a',
  studentId: 7,
  status: EnrollmentStatus.ACTIVE,
  progressPercentage: 10,
  completedLessons: 0,
  totalLessons: 1,
  enrolledAt: '2026-01-01T00:00:00.000Z',
} as EnrollmentResponse;

const enrollmentB = {
  id: 51,
  courseId: 200,
  courseTitle: 'Course B',
  courseSlug: 'course-b',
  studentId: 7,
  status: EnrollmentStatus.ACTIVE,
  progressPercentage: 0,
  completedLessons: 0,
  totalLessons: 1,
  enrolledAt: '2026-01-01T00:00:00.000Z',
} as EnrollmentResponse;

const progressA = {
  id: 90,
  enrollmentId: 50,
  lessonId: 1,
  lessonTitle: 'Lesson A1',
  studentId: 7,
  isCompleted: true,
  watchPercentage: 100,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as LessonProgressResponse;

const progressB = {
  id: 91,
  enrollmentId: 51,
  lessonId: 2,
  lessonTitle: 'Lesson B1',
  studentId: 7,
  isCompleted: true,
  watchPercentage: 100,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as LessonProgressResponse;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

const renderDataHook = (overrides: { courseSlug: string; setCurrentLesson?: ReturnType<typeof vi.fn> } = {
  courseSlug: 'course-a',
}) =>
  renderHook(() =>
    useCoursePlayerData({
      courseSlug: overrides.courseSlug,
      currentLesson: null,
      searchParams: new URLSearchParams(),
      setSearchParams: vi.fn(),
      setCurrentLesson: overrides.setCurrentLesson ?? vi.fn(),
    })
  );

describe('useCoursePlayerData', () => {
  it('fails closed with an access error when the enrollment lookup is empty', async () => {
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseA);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonA1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(null);
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const { result } = renderDataHook();

    await waitFor(() => {
      expect(result.current.accessError).not.toBeNull();
    });

    expect(result.current.accessError?.title).toBe('Enrollment required');
    expect(result.current.accessError?.message).toBe(
      'You must enroll in this course before accessing the content. Please go back to the course page to enroll.'
    );
    expect(result.current.enrollment).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('shows a lookup failure access error when the enrollment lookup rejects', async () => {
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseA);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonA1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockRejectedValue(
      new Error('lookup failed')
    );
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const { result } = renderDataHook();

    await waitFor(() => {
      expect(result.current.accessError?.title).toBe('Unable to load course');
    });
    expect(result.current.accessError?.message).toBe(
      'We were unable to verify your enrollment for this course. Please try again or go back to the course page.'
    );
    expect(result.current.enrollment).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('shows an access error when the enrollment is dropped', async () => {
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseA);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonA1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue({
      ...enrollmentA,
      status: EnrollmentStatus.DROPPED,
    });
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const { result } = renderDataHook();

    await waitFor(() => {
      expect(result.current.accessError?.title).toBe('Enrollment cancelled');
    });
    expect(result.current.enrollment).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('ignores stale lesson progress resolved after a course slug switch', async () => {
    let resolveProgressA!: (value: LessonProgressResponse[]) => void;
    const deferredA = new Promise<LessonProgressResponse[]>((resolve) => {
      resolveProgressA = resolve;
    });

    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseA);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonA1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(enrollmentA);
    vi.mocked(lessonProgressService.getEnrollmentProgress)
      .mockReturnValueOnce(deferredA)
      .mockResolvedValueOnce([progressB]);

    const props = {
      courseSlug: 'course-a',
      currentLesson: null as LessonResponse | null,
      searchParams: new URLSearchParams(),
      setSearchParams: vi.fn(),
      setCurrentLesson: vi.fn(),
    };
    const { result, rerender } = renderHook(() => useCoursePlayerData(props));

    // Course A's enrollment lookup completes and its progress request stays pending.
    await waitFor(() => {
      expect(lessonProgressService.getEnrollmentProgress).toHaveBeenCalledTimes(1);
    });

    // Switch to course B while course A's progress request is still in flight.
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseB);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonB1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(enrollmentB);
    props.courseSlug = 'course-b';
    await act(async () => {
      rerender();
    });

    // Course B loads fully with its own progress.
    await waitFor(() => {
      expect(result.current.allLessonProgress).toEqual([progressB]);
    });

    // Resolving course A's late progress must not leak into the new course.
    await act(async () => {
      resolveProgressA([progressA]);
    });

    expect(result.current.allLessonProgress).toEqual([progressB]);
  });

  it('resets access error and current lesson when switching to a valid course', async () => {
    const setCurrentLesson = vi.fn();
    const props = {
      courseSlug: 'course-a',
      currentLesson: null as LessonResponse | null,
      searchParams: new URLSearchParams(),
      setSearchParams: vi.fn(),
      setCurrentLesson,
    };

    // Course A reports SUSPENDED -> access error is set.
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseA);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonA1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue({
      ...enrollmentA,
      status: EnrollmentStatus.SUSPENDED,
    });
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const { result, rerender } = renderHook(() => useCoursePlayerData(props));

    await waitFor(() => {
      expect(result.current.accessError?.title).toBe('Access suspended');
    });
    expect(result.current.loading).toBe(false);

    // Switch to a valid course B.
    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseB);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([lessonB1]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(enrollmentB);
    props.courseSlug = 'course-b';
    await act(async () => {
      rerender();
    });

    await waitFor(() => {
      expect(result.current.accessError).toBeNull();
      expect(result.current.enrollment).not.toBeNull();
    });

    expect(setCurrentLesson).toHaveBeenCalledWith(null);
  });

  it('sets the search-param type hint from getCourseBySlug nested lessons before getCourseLessons resolves', async () => {
    const nestedLesson = {
      id: 5,
      sectionId: 10,
      title: 'Nested Lesson',
      contentType: ContentType.ARTICLE,
      orderIndex: 0,
      videoUrl: null,
      articleContent: null,
      resources: null,
    } as LessonResponse;

    const courseWithNestedLessons = {
      ...courseA,
      sections: [
        {
          id: 10,
          courseId: 100,
          title: 'Introduction',
          orderIndex: 0,
          lessons: [nestedLesson],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as CourseDetailResponse;

    let resolveLessons!: (value: LessonResponse[]) => void;
    const deferredLessons = new Promise<LessonResponse[]>((resolve) => {
      resolveLessons = resolve;
    });

    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseWithNestedLessons);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockReturnValue(deferredLessons);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(enrollmentA);
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const setSearchParams = vi.fn();
    renderHook(() =>
      useCoursePlayerData({
        courseSlug: 'course-a',
        currentLesson: null,
        searchParams: new URLSearchParams(),
        setSearchParams,
        setCurrentLesson: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(setSearchParams).toHaveBeenCalledWith(
        { lesson: '5', type: ContentType.ARTICLE },
        { replace: true }
      );
    });

    // The lessons round trip (getCourseLessons) is still pending: the hint
    // above came from the nested lessons in getCourseBySlug's response, one
    // round trip earlier than the official resolve.
    expect(setSearchParams).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLessons([]);
    });
  });

  it('never calls setCurrentLesson with the metadata-only lesson data nested in getCourseBySlug', async () => {
    const nestedLesson = {
      id: 5,
      sectionId: 10,
      title: 'Nested Lesson',
      contentType: ContentType.VIDEO,
      orderIndex: 0,
      videoUrl: null,
      articleContent: null,
      resources: null,
    } as LessonResponse;

    const fullLesson = {
      ...nestedLesson,
      videoUrl: 'https://example.com/video.mp4',
    } as LessonResponse;

    const courseWithNestedLessons = {
      ...courseA,
      sections: [
        {
          id: 10,
          courseId: 100,
          title: 'Introduction',
          orderIndex: 0,
          lessons: [nestedLesson],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as CourseDetailResponse;

    vi.mocked(courseService.getCourseBySlug).mockResolvedValue(courseWithNestedLessons);
    vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
    vi.mocked(lessonService.getCourseLessons).mockResolvedValue([fullLesson]);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockResolvedValue(enrollmentA);
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);

    const setCurrentLesson = vi.fn();
    renderHook(() =>
      useCoursePlayerData({
        courseSlug: 'course-a',
        currentLesson: null,
        searchParams: new URLSearchParams(),
        setSearchParams: vi.fn(),
        setCurrentLesson,
      })
    );

    await waitFor(() => {
      expect(setCurrentLesson).toHaveBeenCalledWith(fullLesson);
    });

    expect(setCurrentLesson).not.toHaveBeenCalledWith(
      expect.objectContaining({ videoUrl: null, articleContent: null, resources: null })
    );
  });
});
