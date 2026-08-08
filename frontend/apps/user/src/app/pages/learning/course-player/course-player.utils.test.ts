import { describe, expect, it } from 'vitest';
import type {
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import {
  buildCourseAccessError,
  calculateOptimisticCourseProgress,
  findLessonProgress,
  getAdjacentLessons,
  htmlToPlainText,
  isCourseCompleteFromEnrollment,
  resolveInitialLesson,
  sortCourseLessons,
} from './course-player.utils';

function makeSection(overrides: Partial<SectionResponse> = {}): SectionResponse {
  return {
    id: 1,
    courseId: 100,
    title: 'Section',
    orderIndex: 0,
    lessonCount: 1,
    totalDurationMinutes: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLesson(overrides: Partial<LessonResponse> = {}): LessonResponse {
  return {
    id: 1,
    sectionId: 1,
    courseId: 100,
    title: 'Lesson',
    contentType: 'VIDEO',
    orderIndex: 0,
    isPreview: false,
    isMandatory: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  } as LessonResponse;
}

function makeEnrollment(overrides: Partial<EnrollmentResponse> = {}): EnrollmentResponse {
  return {
    id: 1,
    courseId: 100,
    courseTitle: 'Course',
    studentId: 1,
    status: 'ACTIVE',
    enrolledAt: '2024-01-01T00:00:00Z',
    ...overrides,
  } as EnrollmentResponse;
}

describe('sortCourseLessons', () => {
  it('sorts lessons by section order, then by lesson order within the section', () => {
    const sections = [
      makeSection({ id: 1, orderIndex: 1 }),
      makeSection({ id: 2, orderIndex: 0 }),
    ];
    const lessons = [
      makeLesson({ id: 1, sectionId: 1, orderIndex: 0 }),
      makeLesson({ id: 2, sectionId: 2, orderIndex: 1 }),
      makeLesson({ id: 3, sectionId: 2, orderIndex: 0 }),
    ];

    const sorted = sortCourseLessons(sections, lessons);

    expect(sorted.map((l) => l.id)).toEqual([3, 2, 1]);
  });

  it('sorts lessons with a known section before lessons with an unknown section', () => {
    const sections = [makeSection({ id: 1, orderIndex: 0 })];
    const lessons = [
      makeLesson({ id: 1, sectionId: 999, orderIndex: 0 }),
      makeLesson({ id: 2, sectionId: 1, orderIndex: 0 }),
    ];

    const sorted = sortCourseLessons(sections, lessons);

    expect(sorted.map((l) => l.id)).toEqual([2, 1]);
  });

  it('does not mutate the input lessons array', () => {
    const sections = [makeSection({ id: 1, orderIndex: 0 })];
    const lessons = [
      makeLesson({ id: 2, sectionId: 1, orderIndex: 1 }),
      makeLesson({ id: 1, sectionId: 1, orderIndex: 0 }),
    ];
    const original = [...lessons];

    sortCourseLessons(sections, lessons);

    expect(lessons).toEqual(original);
  });
});

describe('resolveInitialLesson', () => {
  const lessons = [
    makeLesson({ id: 1 }),
    makeLesson({ id: 2 }),
    makeLesson({ id: 3 }),
  ];

  it('returns null when there are no lessons', () => {
    expect(resolveInitialLesson([], '1', '1')).toBeNull();
  });

  it('prefers the query param lesson id', () => {
    expect(resolveInitialLesson(lessons, '2', '3')?.id).toBe(2);
  });

  it('falls back to the stored lesson id when there is no query param', () => {
    expect(resolveInitialLesson(lessons, null, '3')?.id).toBe(3);
  });

  it('falls back to the first lesson when neither is present', () => {
    expect(resolveInitialLesson(lessons, null, null)?.id).toBe(1);
  });

  it('falls back to the first lesson when the query param id does not match', () => {
    expect(resolveInitialLesson(lessons, '999', null)?.id).toBe(1);
  });

  it('falls back to the first lesson when the stored id does not match', () => {
    expect(resolveInitialLesson(lessons, null, '999')?.id).toBe(1);
  });
});

describe('getAdjacentLessons', () => {
  const lessons = [makeLesson({ id: 1 }), makeLesson({ id: 2 }), makeLesson({ id: 3 })];

  it('returns both neighbors for a lesson in the middle', () => {
    expect(getAdjacentLessons(lessons, 2)).toEqual({
      previous: lessons[0],
      next: lessons[2],
    });
  });

  it('returns no previous lesson for the first lesson', () => {
    expect(getAdjacentLessons(lessons, 1)).toEqual({ previous: null, next: lessons[1] });
  });

  it('returns no next lesson for the last lesson', () => {
    expect(getAdjacentLessons(lessons, 3)).toEqual({ previous: lessons[1], next: null });
  });

  it('returns nulls when the lesson id is not found', () => {
    expect(getAdjacentLessons(lessons, 999)).toEqual({ previous: null, next: null });
  });

  it('returns nulls when the lesson id is missing', () => {
    expect(getAdjacentLessons(lessons, null)).toEqual({ previous: null, next: null });
    expect(getAdjacentLessons(lessons, undefined)).toEqual({ previous: null, next: null });
  });
});

describe('findLessonProgress', () => {
  const progress: LessonProgressResponse[] = [
    { lessonId: 1, isCompleted: true, watchPercentage: 100 } as LessonProgressResponse,
    { lessonId: 2, isCompleted: false, watchPercentage: 30 } as LessonProgressResponse,
  ];

  it('returns the matching progress record', () => {
    expect(findLessonProgress(progress, 2)?.watchPercentage).toBe(30);
  });

  it('returns null when there is no matching record', () => {
    expect(findLessonProgress(progress, 999)).toBeNull();
  });
});

describe('isCourseCompleteFromEnrollment', () => {
  it('returns false for a null enrollment', () => {
    expect(isCourseCompleteFromEnrollment(null)).toBe(false);
  });

  it('returns true when progressPercentage is at least 100', () => {
    expect(isCourseCompleteFromEnrollment(makeEnrollment({ progressPercentage: 100 }))).toBe(true);
  });

  it('returns true when completedLessons has caught up with totalLessons', () => {
    expect(
      isCourseCompleteFromEnrollment(
        makeEnrollment({ progressPercentage: 90, completedLessons: 5, totalLessons: 5 })
      )
    ).toBe(true);
  });

  it('returns false when totalLessons is zero', () => {
    expect(
      isCourseCompleteFromEnrollment(
        makeEnrollment({ progressPercentage: 0, completedLessons: 0, totalLessons: 0 })
      )
    ).toBe(false);
  });

  it('returns false for an in-progress enrollment', () => {
    expect(
      isCourseCompleteFromEnrollment(
        makeEnrollment({ progressPercentage: 40, completedLessons: 2, totalLessons: 5 })
      )
    ).toBe(false);
  });
});

describe('calculateOptimisticCourseProgress', () => {
  it('bumps completedLessons by one and computes the rounded percentage', () => {
    const result = calculateOptimisticCourseProgress(
      makeEnrollment({ completedLessons: 1, progressPercentage: 20 }),
      5
    );
    expect(result).toEqual({ completedLessons: 2, progressPercentage: 40 });
  });

  it('caps the percentage at 100', () => {
    const result = calculateOptimisticCourseProgress(
      makeEnrollment({ completedLessons: 9, progressPercentage: 90 }),
      10
    );
    expect(result).toEqual({ completedLessons: 10, progressPercentage: 100 });
  });

  it('treats a missing completedLessons as zero', () => {
    const result = calculateOptimisticCourseProgress(
      makeEnrollment({ completedLessons: undefined, progressPercentage: 0 }),
      4
    );
    expect(result).toEqual({ completedLessons: 1, progressPercentage: 25 });
  });

  it('falls back to the enrollment progressPercentage when lessonCount is zero', () => {
    const result = calculateOptimisticCourseProgress(
      makeEnrollment({ completedLessons: 0, progressPercentage: 55 }),
      0
    );
    expect(result).toEqual({ completedLessons: 1, progressPercentage: 55 });
  });
});

describe('htmlToPlainText', () => {
  it('strips tags and returns the text content', () => {
    expect(htmlToPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('returns the original string for plain text', () => {
    expect(htmlToPlainText('just text')).toBe('just text');
  });

  it('returns an empty string for empty html', () => {
    expect(htmlToPlainText('')).toBe('');
  });
});

describe('buildCourseAccessError', () => {
  it('builds the not-enrolled error redirecting to the course detail page', () => {
    const error = buildCourseAccessError('NOT_ENROLLED', 'my-course');
    expect(error.title).toBe('Enrollment required');
    expect(error.message).toBe(
      'You must enroll in this course before accessing the content. Please go back to the course page to enroll.'
    );
    expect(error.redirectTo).toBe('/courses/my-course');
  });

  it('builds the dropped-enrollment error redirecting to the course detail page', () => {
    const error = buildCourseAccessError('DROPPED', 'my-course');
    expect(error.title).toBe('Enrollment cancelled');
    expect(error.message).toBe(
      'Your enrollment for this course has been cancelled. Please purchase/enroll again to access the content.'
    );
    expect(error.redirectTo).toBe('/courses/my-course');
  });

  it('builds the suspended error redirecting to My Learning', () => {
    const error = buildCourseAccessError('SUSPENDED', 'my-course');
    expect(error.title).toBe('Access suspended');
    expect(error.message).toBe(
      'Your access to this course has been suspended. Please contact your instructor or support if you believe this is a mistake.'
    );
    expect(error.redirectTo).toBe('/learning');
  });
});
