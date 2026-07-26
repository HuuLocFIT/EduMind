/**
 * Prefetch helpers (zero-latency UI)
 *
 * Warm the React Query cache on intent (e.g. hovering a course card) so the
 * target page renders instantly from cache instead of showing a spinner.
 */
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { courseService } from "../services/course.service";
import { STALE_TIME_COURSE_DETAIL } from "./query-config";

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
