import type { LessonResponse } from '@edumind/shared-types';

/**
 * Shown instead of the player when the current user cannot access the
 * course (not enrolled, dropped, suspended, or the enrollment lookup failed).
 */
export interface AccessError {
  title: string;
  message: string;
  redirectTo: string;
}

/** Retryable error surfaced next to the video progress autosave status. */
export interface ProgressSaveError {
  message: string;
  retry: () => Promise<void>;
}

/** Retryable error surfaced when marking a lesson (or reconciling) fails. */
export interface CompletionError {
  message: string;
  retry: () => Promise<void>;
}

/** Countdown state driving the "moving to next lesson in N seconds" banner. */
export interface AutoAdvanceState {
  nextLesson: LessonResponse;
  secondsRemaining: number;
}

/** Where a lesson completion was triggered from. */
export type CompletionSource = 'manual' | 'video' | 'quiz';

/** Options accepted by lesson-navigation handlers. */
export interface LessonClickOptions {
  focusContent?: boolean;
  closeMobileSidebar?: boolean;
}
