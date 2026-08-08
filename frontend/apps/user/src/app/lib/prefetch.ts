/**
 * Prefetch helpers (zero-latency UI)
 *
 * Warm the React Query cache on intent (e.g. hovering a course card) so the
 * target page renders instantly from cache instead of showing a spinner.
 */
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { courseService } from "../services/course.service";
import { aiService } from "../services/ai.service";
import { STALE_TIME_COURSE_DETAIL, STALE_TIME_QUIZ, STALE_TIME_LESSON_SUMMARY } from "./query-config";

/**
 * Prefetch a course detail into the cache.
 *
 * IMPORTANT: CourseDetailPage keys this query with the raw route param
 * (a string), so we must stringify the id here for the prefetch to be a
 * cache hit on navigation.
 */
export const prefetchCourseDetail = (
  queryClient: QueryClient,
  slugOrId: string | number
) => {
  const identifier = String(slugOrId);
  if (!identifier) return;

  queryClient.prefetchQuery({
    queryKey: queryKeys.courses.detail(identifier),
    queryFn: () =>
      typeof slugOrId === 'string'
        ? courseService.getCourseBySlug(slugOrId)
        : courseService.getCourseById(slugOrId),
    staleTime: STALE_TIME_COURSE_DETAIL,
  });
};

/**
 * Prefetch a quiz lesson's quiz + the student's past attempts into the
 * cache. Called as soon as the user navigates to a QUIZ-type lesson (before
 * QuizTakerContent mounts) so the fetch is already in flight — a cache hit
 * on a revisit renders instantly with no loading flash.
 */
export const prefetchLessonQuiz = (queryClient: QueryClient, lessonId: number) => {
  if (!lessonId) return;

  queryClient.prefetchQuery({
    queryKey: queryKeys.ai.quiz(lessonId),
    queryFn: () => aiService.getQuizForStudent(lessonId),
    staleTime: STALE_TIME_QUIZ,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.ai.attempts(lessonId),
    queryFn: () => aiService.getMyAttempts(lessonId),
    staleTime: STALE_TIME_QUIZ,
  });
};

/**
 * Prefetch a lesson's AI summary into the cache. Called as soon as the user
 * navigates to an ARTICLE/VIDEO-type lesson (before LessonSummaryPanel
 * mounts) so a revisit within this session renders instantly with no
 * loading flash.
 */
export const prefetchLessonSummary = (queryClient: QueryClient, lessonId: number) => {
  if (!lessonId) return;

  queryClient.prefetchQuery({
    queryKey: queryKeys.ai.summary(lessonId),
    queryFn: () => aiService.getSummaryByLesson(lessonId),
    staleTime: STALE_TIME_LESSON_SUMMARY,
  });
};
