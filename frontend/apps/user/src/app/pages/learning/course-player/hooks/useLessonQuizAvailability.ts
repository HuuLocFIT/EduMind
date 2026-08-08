import { useEffect, useState } from 'react';
import { ContentType } from '@edumind/shared-constants';
import type { LessonResponse } from '@edumind/shared-types';
import { aiService } from '../../../../services/ai.service';

/**
 * Checks whether a generated quiz exists for the current lesson. QUIZ-type
 * lessons skip the check (they are the quiz). Stale responses from a
 * lesson switch mid-flight are ignored via the isSubscribed guard.
 */
export function useLessonQuizAvailability(
  lessonId: number | undefined,
  contentType: LessonResponse['contentType'] | undefined
) {
  const [hasQuiz, setHasQuiz] = useState<boolean | null>(null);

  useEffect(() => {
    if (!lessonId || contentType === ContentType.QUIZ) return;
    let isSubscribed = true;

    aiService
      .getQuizForStudent(lessonId)
      .then((quiz) => {
        if (isSubscribed) {
          setHasQuiz(quiz !== null);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setHasQuiz(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [lessonId, contentType]);

  return { hasQuiz, setHasQuiz };
}
