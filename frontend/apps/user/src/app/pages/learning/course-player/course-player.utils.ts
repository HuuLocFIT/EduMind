import type {
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { EnrollmentStatus } from '@edumind/shared-constants';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import type { AccessError } from './course-player.types';

/**
 * Sort lessons by their section's order, then by lesson order within the
 * section. Lessons whose section could not be found sort after lessons with
 * a known section. Does not mutate the input array.
 */
export function sortCourseLessons(
  sections: SectionResponse[],
  lessons: LessonResponse[]
): LessonResponse[] {
  return [...lessons].sort((a, b) => {
    const sectionA = sections.find((s) => s.id === a.sectionId);
    const sectionB = sections.find((s) => s.id === b.sectionId);

    if (sectionA && sectionB) {
      const sectionOrderDiff = sectionA.orderIndex - sectionB.orderIndex;
      if (sectionOrderDiff !== 0) return sectionOrderDiff;
    }

    // If one of them doesn't belong to any known section, keep original orderIndex grouping
    if (!sectionA && sectionB) return 1;
    if (sectionA && !sectionB) return -1;

    // Then sort by lesson order within section
    return a.orderIndex - b.orderIndex;
  });
}

/**
 * Resolve which lesson should be shown on load: an explicit query param wins,
 * then the last-visited lesson from localStorage, then the first lesson.
 */
export function resolveInitialLesson(
  lessons: LessonResponse[],
  queryLessonId?: string | null,
  storedLessonId?: string | null
): LessonResponse | null {
  if (lessons.length === 0) return null;

  if (queryLessonId) {
    return lessons.find((l) => l.id === Number(queryLessonId)) || lessons[0];
  }
  if (storedLessonId) {
    return lessons.find((l) => l.id === Number(storedLessonId)) || lessons[0];
  }
  return lessons[0];
}

/** Find the previous/next lesson relative to the current lesson in list order. */
export function getAdjacentLessons(
  lessons: LessonResponse[],
  currentLessonId: number | null | undefined
): { previous: LessonResponse | null; next: LessonResponse | null } {
  if (currentLessonId == null) return { previous: null, next: null };

  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  if (currentIndex === -1) return { previous: null, next: null };

  return {
    previous: currentIndex > 0 ? lessons[currentIndex - 1] : null,
    next: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null,
  };
}

/** Find the progress record for a specific lesson, if any. */
export function findLessonProgress(
  progress: LessonProgressResponse[],
  lessonId: number
): LessonProgressResponse | null {
  return progress.find((p) => p.lessonId === lessonId) || null;
}

/**
 * Server-confirmed completion check. Only meant to be applied to enrollments
 * that came back from the server (initial load / reconciliation), never to
 * an optimistically-bumped enrollment, so the completion UI stays honest.
 */
export function isCourseCompleteFromEnrollment(
  enrollment: EnrollmentResponse | null
): boolean {
  return (
    enrollment !== null &&
    ((enrollment.progressPercentage ?? 0) >= 100 ||
      ((enrollment.completedLessons ?? 0) >= (enrollment.totalLessons ?? 0) &&
        (enrollment.totalLessons ?? 0) > 0))
  );
}

/**
 * Compute the optimistic "one more lesson completed" bump to an enrollment's
 * completedLessons/progressPercentage, used to update the UI instantly before
 * the server confirms. Percentage falls back to the enrollment's current
 * value when the lesson count is unknown/zero.
 */
export function calculateOptimisticCourseProgress(
  enrollment: EnrollmentResponse,
  lessonCount: number
): { completedLessons: number; progressPercentage: number | null | undefined } {
  const completedLessons = (enrollment.completedLessons || 0) + 1;
  const progressPercentage =
    lessonCount > 0
      ? Math.min(100, Math.round((completedLessons / lessonCount) * 100))
      : enrollment.progressPercentage;

  return { completedLessons, progressPercentage };
}

/** Convert lesson article HTML to plain text for the transcript download. */
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || html;
}

/** Status values that can produce a course access error. */
export type CourseAccessErrorStatus =
  | 'NOT_ENROLLED'
  | typeof EnrollmentStatus.DROPPED
  | typeof EnrollmentStatus.SUSPENDED;

/**
 * Build the access-error shown when the student is not enrolled, was
 * dropped, or is suspended. Messages/redirects are kept byte-identical to
 * the copy that used to live inline in the page's checkEnrollment logic.
 *
 * - NOT_ENROLLED: treat as never enrolled -> redirect to course detail.
 * - DROPPED: treat as not enrolled -> redirect to course detail / purchase.
 * - SUSPENDED: student still "owns" the course but access is forbidden.
 */
export function buildCourseAccessError(
  status: CourseAccessErrorStatus,
  courseSlug: string
): AccessError {
  if (status === 'NOT_ENROLLED') {
    return {
      title: 'Enrollment required',
      message:
        'You must enroll in this course before accessing the content. Please go back to the course page to enroll.',
      redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseSlug }),
    };
  }

  if (status === EnrollmentStatus.DROPPED) {
    return {
      title: 'Enrollment cancelled',
      message:
        'Your enrollment for this course has been cancelled. Please purchase/enroll again to access the content.',
      redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseSlug }),
    };
  }

  return {
    title: 'Access suspended',
    message:
      'Your access to this course has been suspended. Please contact your instructor or support if you believe this is a mistake.',
    redirectTo: USER_ROUTES.LEARNING,
  };
}
