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
import { useVersionGuard } from './useVersionGuard';

interface UseLessonCompletionOptions {
  currentLesson: LessonResponse | null;
  enrollment: EnrollmentResponse | null;
  lessons: LessonResponse[];
  allLessonProgress: LessonProgressResponse[];
  /**
   * Not sent to the server (the completion call only needs
   * enrollmentId/lessonId) — read only to detect that the user left this
   * course while a completion was in flight, so a stale completion can never
   * surface its reconcile error on a different course.
   */
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
  autoAdvanceDelaySeconds: number;
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
  resolvedCourseId,
  getNextLesson,
  onProgressChange,
  onEnrollmentChange,
  reconcileEnrollmentProgress,
  autoAdvanceDelaySeconds,
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

  // Bumped whenever the lesson changes so a completeLesson() call still in
  // flight for the previous lesson can never show its failure error (or move
  // focus, announce, or auto-advance) on the lesson the user has since
  // navigated to. A course switch resets currentLesson to null, so this also
  // covers "the user left the course entirely".
  const lessonVersion = useVersionGuard();

  // Live mirror of the current course, used to gate completionReconcileError:
  // that error is deliberately kept across a lesson change (auto-advance moves
  // the lesson right after a successful completion), so it cannot be gated by
  // lessonVersion — but it must still be dropped when the operation belongs to
  // a course the user has already left.
  const resolvedCourseIdRef = useRef(resolvedCourseId);
  useEffect(() => {
    resolvedCourseIdRef.current = resolvedCourseId;
  }, [resolvedCourseId]);

  // Clear the completion announcement and any per-lesson completion error
  // whenever the lesson changes, mirroring the previous inline reset that ran
  // as part of lesson selection. completionReconcileError is intentionally not
  // cleared here — auto-advance changes the lesson right after a successful
  // completion, so clearing it would hide the "progress could not be
  // refreshed" message almost immediately.
  useEffect(() => {
    lessonVersion.bump();
    setCompletionAnnouncement('');
    setCompletionError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id]);

  // Optimistically mark a lesson complete in local state so the UI updates
  // instantly (zero-latency). Returns a per-field snapshot so callers can roll
  // back exactly what was bumped if the server call ultimately fails, without
  // clobbering progress/enrollment changes that happened since.
  const markLessonCompletedLocally = (lessonId: number) => {
    const prevLessonProgress = findLessonProgress(allLessonProgress, lessonId);
    const alreadyCompleted = prevLessonProgress?.isCompleted;
    const prevCompletedLessons = enrollment?.completedLessons ?? 0;
    const prevProgressPercentage = enrollment?.progressPercentage;

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

    return { prevLessonProgress, alreadyCompleted, prevCompletedLessons, prevProgressPercentage };
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

    // Synchronous guard prevents a double-submit on rapid double activation.
    if (completingLessonRef.current !== null) return;

    clearAutoAdvance();
    stopAutosave();

    completingLessonRef.current = lessonId;
    setCompletingLessonId(lessonId);
    setCompletionError(null);
    setCompletionReconcileError(null);

    const version = lessonVersion.current();
    const ownerCourseId = resolvedCourseId;
    const belongsToCurrentCourse = () => ownerCourseId === resolvedCourseIdRef.current;
    const snapshot = markLessonCompletedLocally(lessonId);

    try {
      await lessonProgressService.completeLesson(enrollmentId, lessonId);

      // Always attempt reconciliation, even if the user has left this lesson or
      // course: it self-guards its own state writes and is what refreshes the
      // cross-page enrollment caches after a completion that did succeed.
      try {
        await reconcileEnrollmentProgress(enrollmentId);
      } catch (err) {
        console.error('Error reconciling lesson progress:', err);
        // Survives a lesson change within the course (auto-advance), but not a
        // course switch — the message would be about a course the user left.
        if (belongsToCurrentCourse()) {
          setCompletionReconcileError({
            message: 'The lesson was completed, but course progress could not be refreshed.',
            retry: () => retryCompletionReconciliation(enrollmentId),
          });
        }
      }

      // The user moved to another lesson (or left the course) while this
      // completion was in flight. Announcing "<lesson A> completed" and
      // starting a countdown to lesson A's successor would both be wrong for
      // where the user actually is now, so stop here — the completion itself is
      // already persisted and reconciled.
      if (!lessonVersion.isCurrent(version)) return;

      const nextLesson = getNextLesson();
      // A watch-progress autosave can mark a video complete at 90% before the
      // native `ended` event arrives. In that case the local lesson record is
      // already complete, but we must still reconcile the enrollment and start
      // auto-advance. Do not announce a second optimistic course-progress bump.
      const progressPercentage = snapshot.alreadyCompleted
        ? enrollment.progressPercentage
        : calculateOptimisticCourseProgress(enrollment, lessons.length).progressPercentage;
      const pct = progressPercentage ?? 0;

      setCompletionAnnouncement(
        nextLesson
          ? `${currentLesson.title} completed. Course progress is ${pct}%. Moving to ${nextLesson.title} in ${autoAdvanceDelaySeconds} seconds. To remain on this lesson, activate Cancel auto-advance.`
          : `${currentLesson.title} completed. Course progress is ${pct}%.`
      );

      if (nextLesson) {
        startAutoAdvance(nextLesson);
      }
      // else: course completed, no auto-advance. The completion heading is
      // focused once confirmedCourseComplete flips to true after reconciliation.
    } catch (err: any) {
      console.error('Error completing lesson:', err);
      // Roll back the optimistic bump — but only into the course it was applied
      // to. After a course switch that state was already discarded by
      // resetCourseState, and rolling back here would instead overwrite the new
      // course's enrollment counters with the old course's snapshot values.
      // Within the same course the rollback always runs, keyed on the original
      // lessonId, even if the user has moved to another lesson since.
      if (belongsToCurrentCourse()) {
        // Two distinct cases:
        //  - The record is still the synthetic one invented by
        //    markLessonCompletedLocally (no server `id`): drop it entirely, or
        //    its fabricated watchPercentage: 100 would survive the rollback.
        //  - A real record exists (pre-existing, or upserted by a video
        //    autosave that landed while completion was pending): keep every
        //    field and revert only `isCompleted`, the one field that was bumped.
        onProgressChange((prev) => {
          const existing = prev.find((p) => p.lessonId === lessonId);
          if (!existing) return prev;
          if (existing.id === undefined) {
            return prev.filter((p) => p.lessonId !== lessonId);
          }
          return prev.map((p) =>
            p.lessonId === lessonId ? { ...p, isCompleted: Boolean(snapshot.alreadyCompleted) } : p
          );
        });
        if (!snapshot.alreadyCompleted) {
          onEnrollmentChange((prev) =>
            prev
              ? {
                  ...prev,
                  completedLessons: snapshot.prevCompletedLessons,
                  progressPercentage: snapshot.prevProgressPercentage,
                }
              : prev
          );
        }
      }
      // Only surface the error/retry (and move focus) if the user is still on
      // this lesson — otherwise a completion that failed after the user
      // already navigated away would show lesson A's error on lesson B and
      // retry lesson A instead of B.
      if (lessonVersion.isCurrent(version)) {
        setCompletionError({
          message: err?.message || 'Failed to mark lesson as complete',
          retry: () => completeLesson(source),
        });
        // Keep keyboard focus on Mark complete (when it still exists) instead
        // of letting it fall back to the page body after the optimistic rollback.
        restoreCompletionFocus();
      }
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
    announceAutoAdvanceCancelled: () => {
      setCompletionAnnouncement('Auto-advance cancelled. Staying on the current lesson.');
    },
    completeLesson,
    retryCompletionReconciliation,
  };
}
