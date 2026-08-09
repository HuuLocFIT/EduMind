import { useQuery } from "@tanstack/react-query";
import type { GeneratedQuizResponse, QuizAttemptResponse } from "@edumind/shared-types";
import { queryKeys } from "../lib/query-keys";
import { STALE_TIME_QUIZ } from "../lib/query-config";
import { aiService } from "../services/ai.service";

/**
 * The quiz a student is meant to take for a lesson (or null if the
 * instructor hasn't generated one yet). Cached so revisiting a quiz lesson
 * in the same session renders instantly instead of re-showing a loading state.
 */
export const useQuizForLesson = (lessonId: number | undefined) => {
  return useQuery<GeneratedQuizResponse | null>({
    queryKey: queryKeys.ai.quiz(lessonId ?? 0),
    queryFn: () => aiService.getQuizForStudent(lessonId as number),
    enabled: !!lessonId,
    staleTime: STALE_TIME_QUIZ,
  });
};

/**
 * A student's past attempts for a lesson's quiz, most recent first (as
 * returned by the API). Submitting a new attempt patches this cache
 * directly (see QuizTakerContent) rather than invalidating, so the UI never
 * has to show a loading state right after a fresh submission.
 */
export const useQuizAttempts = (lessonId: number | undefined) => {
  return useQuery<QuizAttemptResponse[]>({
    queryKey: queryKeys.ai.attempts(lessonId ?? 0),
    queryFn: () => aiService.getMyAttempts(lessonId as number),
    enabled: !!lessonId,
    staleTime: STALE_TIME_QUIZ,
  });
};
