import { useEffect, useRef, useState } from 'react';
import type { LessonResponse } from '@edumind/shared-types';
import type { AutoAdvanceState, LessonClickOptions } from '../course-player.types';

interface UseAutoAdvanceOptions {
  delaySeconds: number;
  /**
   * Called when the countdown timer fires (not when the user clicks "go
   * now" — the page handles that path itself since it's a direct,
   * immediate navigation rather than the timer elapsing).
   */
  onAdvance: (nextLesson: LessonResponse, options: LessonClickOptions) => void;
  /**
   * Called after `cancelAutoAdvance` tears down the timers, to restore
   * focus to the lesson the user chose to stay on (e.g. focus its heading).
   */
  onCancelFocus: () => void;
  /** Whether the mobile sidebar should close when the timer auto-fires. */
  isDesktop: boolean;
  /**
   * Any pending timers are cleared whenever this changes (e.g. the course
   * slug), matching the page's previous per-course cleanup effect, in
   * addition to cleanup on unmount.
   */
  resetKey?: unknown;
}

/**
 * Owns the "moving to next lesson in N seconds" auto-advance countdown
 * shown after a lesson completes: starting/clearing/cancelling the timer
 * and interval, and the countdown state driving the banner.
 */
export function useAutoAdvance({
  delaySeconds,
  onAdvance,
  onCancelFocus,
  isDesktop,
  resetKey,
}: UseAutoAdvanceOptions) {
  const [autoAdvance, setAutoAdvance] = useState<AutoAdvanceState | null>(null);

  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current);
      autoAdvanceIntervalRef.current = null;
    }
    setAutoAdvance(null);
  };

  const startAutoAdvance = (nextLesson: LessonResponse) => {
    clearAutoAdvance();
    setAutoAdvance({ nextLesson, secondsRemaining: delaySeconds });

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      clearAutoAdvance();
      onAdvance(nextLesson, { focusContent: true, closeMobileSidebar: !isDesktop });
    }, delaySeconds * 1000);

    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvance((prev) =>
        prev && prev.secondsRemaining > 1
          ? { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
          : prev
      );
    }, 1000);
  };

  const cancelAutoAdvance = () => {
    clearAutoAdvance();
    // Keep the user on the current lesson and restore focus to its content.
    onCancelFocus();
  };

  // Clear any pending timers whenever resetKey changes (e.g. the course
  // slug) or the hook unmounts. Mirrors the page's previous per-course
  // cleanup effect.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
        autoAdvanceIntervalRef.current = null;
      }
    };
  }, [resetKey]);

  return {
    autoAdvance,
    startAutoAdvance,
    clearAutoAdvance,
    cancelAutoAdvance,
  };
}
