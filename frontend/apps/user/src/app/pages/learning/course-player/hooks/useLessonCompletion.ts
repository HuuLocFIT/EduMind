import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
} from '@edumind/shared-types';
import { lessonProgressService } from '../../../../services/lesson-progress.service';
import type { CompletionError, CompletionSource } from '../course-player.types';
import { calculateOptimisticCourseProgress, findLessonProgress } from '../course-player.utils';

interface UseLessonCompletionOptions {
  currentLesson: LessonResponse | null;
  enrollment: EnrollmentResponse | null;
  lessons: LessonResponse[];
  allLessonProgress: LessonProgressResponse[];
  /** Not read directly (the completion call only needs enrollmentId/lessonId) — kept for parity with the hook's documented input shape. */
  resolvedCourseId: number | null;
  /** Read at call time (not a snapshot) so a just-completed lesson's next-lesson lookup is never stale. */
  getNextLesson: () => LessonResponse | null;
  onProgressChange: Dispatch<SetStateAction<LessonProgressResponse[]>>;
  onEnrollmentChange: Dispatch<SetStateAction<EnrollmentResponse | null>>;
  /**
   * Not called by this hook: `confirmedCourseComplete` is only ever derived
   * from server-confirmed enrollment data inside `reconcileEnrollmentProgress`
   * (see useCoursePlayerData), never optimistically from a completion call.
   * Kept in the input shape so that invariant is explicit and callers don't
   * need a second way to flip it.
   */
  onConfirmedCourseCompletion?: (complete: boolean) => void;
  reconcileEnrollmentProgress: (enrollmentId: number) => Promise<void>;
  startAutoAdvance: (nextLesson: LessonResponse) => void;
  clearAutoAdvance: () => void;
  stopAutosave: () => void;
  /** Restores keyboard focus to the Mark Complete control after a rollback. */
  restoreCompletionFocus: () => void;
}

/**
 * Owns the single completion path shared by all three completion sources
 * (manual "Mark complete", video-ended, quiz-pass): optimistic mark-complete,
 * server confirmation, post-completion enrollment/progress reconciliation
 * (with its own retry), rollback-on-failure, and triggering auto-advance.
 */
export function useLessonCompletion({
  currentLesson,
  enrollment,
  lessons,
  allLessonProgress,
  getNextLesson,
  onProgressChange,
  onEnrollmentChange,
  reconcileEnrollmentProgress,
  startAutoAdvance,
  clearAutoAdvance,
  stopAutosave,
  restoreCompletionFocus,
}: UseLessonCompletionOptions) {
  const [completingLessonId, setCompletingLessonId] = useState<number | null>(null);
  const completingLessonRef = useRef<number | null>(null);

  const [completionError, setCompletionError] = useState<CompletionError | null>(null);
  const [completionReconcileError, setCompletionReconcileError] = useState<CompletionError | null>(
    null
  );
  const [completionReconcileInFlight, setCompletionReconcileInFlight] = useState(false);
  const completionReconcileInFlightRef = useRef(false);

  const [completionAnnouncement, setCompletionAnnouncement] = useState('');

  // Clear the completion announcement whenever the lesson changes, mirroring
  // the previous inline reset that ran as part of lesson selection.
  useEffect(() => {
    setCompletionAnnouncement('');
  }, [currentLesson?.id]);

  // Optimistically mark a lesson complete in local state so the UI updates
  // instantly (zero-latency). Returns a snapshot so callers can roll back if
  // the server call ultimately fails.
  const markLessonCompletedLocally = (lessonId: number) => {
    const prevProgress = allLessonProgress;
    const prevEnrollment = enrollment;
    const alreadyCompleted = findLessonProgress(allLessonProgress, lessonId)?.isCompleted;

    onProgressChange((prev) => {
      const existing = prev.find((p) => p.lessonId === lessonId);
      if (!existing) {
        return [
          ...prev,
          {
            lessonId,
            isCompleted: true,
            watchPercentage: 100,
          } as LessonProgressResponse,
        ];
      }
      return prev.map((p) => (p.lessonId === lessonId ? { ...p, isCompleted: true } : p));
    });

    // Bump the course progress bar optimistically (only when newly completed)
    if (!alreadyCompleted && enrollment) {
      const { completedLessons: newCompleted, progressPercentage } =
        calculateOptimisticCourseProgress(enrollment, lessons.length);
      onEnrollmentChange({
        ...enrollment,
        completedLessons: newCompleted,
        progressPercentage,
      });
    }

    return { prevProgress, prevEnrollment };
  };

  const retryCompletionReconciliation = async (enrollmentId: number) => {
    if (completionReconcileInFlightRef.current) return;

    completionReconcileInFlightRef.current = true;
    setCompletionReconcileInFlight(true);
    setCompletionReconcileError(null);
    try {
      await reconcileEnrollmentProgress(enrollmentId);
      setCompletionAnnouncement('Course progress updated.');
    } catch (err) {
      console.error('Error reconciling lesson progress:', err);
      setCompletionReconcileError({
        message: 'The lesson was completed, but course progress could not be refreshed.',
        retry: () => retryCompletionReconciliation(enrollmentId),
      });
    } finally {
      completionReconcileInFlightRef.current = false;
      setCompletionReconcileInFlight(false);
    }
  };

  const completeLesson = async (source: CompletionSource) => {
    if (!currentLesson || !enrollment) return;

    const lessonId = currentLesson.id;
    const enrollmentId = enrollment.id;

    if (findLessonProgress(allLessonProgress, lessonId)?.isCompleted) return;
    // Synchronous guard prevents a double-submit on rapid double activation.
    if (completingLessonRef.current !== null) return;

    clearAutoAdvance();
    stopAutosave();

    completingLessonRef.current = lessonId;
    setCompletingLessonId(lessonId);
    setCompletionError(null);
    setCompletionReconcileError(null);

    const snapshot = markLessonCompletedLocally(lessonId);

    try {
      await lessonProgressService.completeLesson(enrollmentId, lessonId);

      try {
        await reconcileEnrollmentProgress(enrollmentId);
      } catch (err) {
        console.error('Error reconciling lesson progress:', err);
        setCompletionReconcileError({
          message: 'The lesson was completed, but course progress could not be refreshed.',
          retry: () => retryCompletionReconciliation(enrollmentId),
        });
      }

      const nextLesson = getNextLesson();
      const { progressPercentage } = calculateOptimisticCourseProgress(enrollment, lessons.length);
      const pct = progressPercentage ?? 0;

      setCompletionAnnouncement(`${currentLesson.title} completed. Course progress is ${pct}%.`);

      if (nextLesson) {
        startAutoAdvance(nextLesson);
      }
      // else: course completed, no auto-advance. The completion heading is
      // focused once confirmedCourseComplete flips to true after reconciliation.
    } catch (err: any) {
      console.error('Error completing lesson:', err);
      // Roll back optimistic completion and keep the current lesson.
      onProgressChange(snapshot.prevProgress);
      if (snapshot.prevEnrollment) onEnrollmentChange(snapshot.prevEnrollment);
      setCompletionError({
        message: err?.message || 'Failed to mark lesson as complete',
        retry: () => completeLesson(source),
      });
      // Keep keyboard focus on Mark complete (when it still exists) instead of
      // letting it fall back to the page body after the optimistic rollback.
      restoreCompletionFocus();
    } finally {
      completingLessonRef.current = null;
      setCompletingLessonId(null);
    }
  };

  return {
    completingLessonId,
    completionError,
    completionReconcileError,
    completionReconcileInFlight,
    completionAnnouncement,
    completeLesson,
    retryCompletionReconciliation,
  };
}
