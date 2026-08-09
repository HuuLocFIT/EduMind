import { useQuery } from "@tanstack/react-query";
import type { LessonSummaryResponse } from "@edumind/shared-types";
import { queryKeys } from "../lib/query-keys";
import { STALE_TIME_LESSON_SUMMARY } from "../lib/query-config";
import { aiService } from "../services/ai.service";

/**
 * The AI-generated summary for a lesson (or null if not yet generated).
 * Cached so revisiting a lesson in the same session renders instantly
 * instead of re-showing a loading state.
 */
export const useLessonSummary = (lessonId: number | undefined) => {
  return useQuery<LessonSummaryResponse | null>({
    queryKey: queryKeys.ai.summary(lessonId ?? 0),
    queryFn: () => aiService.getSummaryByLesson(lessonId as number),
    enabled: !!lessonId,
    staleTime: STALE_TIME_LESSON_SUMMARY,
  });
};
