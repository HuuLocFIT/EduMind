import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Headless UI keeps the page behind a closing dialog inert for the length of
 * its 300 ms exit transition, so nothing focused or announced before that has
 * any effect for assistive technology. Headless UI's own Dialog also restores
 * focus to whatever was focused before it opened once that transition ends
 * (its `RestoreFocus` behavior, always on for `Dialog`) — this value must
 * stay comfortably above 300 ms so our focus move always lands after that
 * restore, not before it.
 */
export const DIALOG_EXIT_MS = 500;

/**
 * VoiceOver/WebKit preempt the pending `aria-live="polite"` queue whenever
 * focus moves: the accessible name of the newly focused element wins and the
 * queued sentence is discarded. The announcement therefore has to be written
 * *after* the focus utterance has started — never in the same tick.
 */
export const FOCUS_SETTLE_MS = 400;

export interface PendingRemoval {
  /** Identifies the removed row so the sequence waits for it to really be gone. */
  courseId: number;
  /** Position the removed row held, used to pick its successor. */
  index: number;
  /** Sentence to place in the live region once focus has settled. */
  message: string;
}

interface UseRemovalAnnouncementOptions {
  /** Current rows; the sequence starts once the removed row has left this list. */
  items: readonly { courseId: number }[];
  /** Container that holds the `[data-cart-item]` rows. */
  getFocusRoot: () => HTMLElement | null;
  /** Tried in order when no successor row exists (empty-state heading, then page/dialog heading). */
  fallbackRefs: readonly React.RefObject<HTMLElement | null>[];
}

/**
 * Coordinates the two things a cart removal owes a screen-reader user: moving
 * focus somewhere sensible (WCAG 2.4.3) and announcing what changed (WCAG
 * 4.1.3). They run as a single chained sequence — focus first, announcement
 * afterwards — because scheduling them in parallel makes VoiceOver drop the
 * announcement outright.
 */
export function useRemovalAnnouncement({
  items,
  getFocusRoot,
  fallbackRefs,
}: UseRemovalAnnouncementOptions) {
  const [announcement, setAnnouncement] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through refs so callers can pass inline closures/arrays without
  // retriggering the sequence on every render.
  const getFocusRootRef = useRef(getFocusRoot);
  const fallbackRefsRef = useRef(fallbackRefs);
  getFocusRootRef.current = getFocusRoot;
  fallbackRefsRef.current = fallbackRefs;

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingTimer, [clearPendingTimer]);

  const scheduleRemovalFeedback = useCallback(
    (removal: PendingRemoval) => {
      clearPendingTimer();
      // Reset to an empty region first so `aria-atomic` sees a real change even
      // when two consecutive removals produce the same sentence.
      setAnnouncement("");
      setPendingRemoval(removal);
    },
    [clearPendingTimer]
  );

  useEffect(() => {
    if (!pendingRemoval) return;
    // The optimistic cache update may not have landed yet; focusing while the
    // removed row is still rendered would land on the row that is about to go.
    if (items.some((item) => item.courseId === pendingRemoval.courseId)) return;

    clearPendingTimer();
    timerRef.current = setTimeout(() => {
      const remaining = getFocusRootRef.current()?.querySelectorAll<HTMLElement>("[data-cart-item]");
      const targetIndex = Math.min(
        pendingRemoval.index,
        Math.max((remaining?.length || 1) - 1, 0)
      );
      const successor = remaining?.[targetIndex];
      const focusTarget =
        successor?.querySelector<HTMLElement>("a, button") ||
        fallbackRefsRef.current.map((ref) => ref.current).find(Boolean) ||
        null;
      focusTarget?.focus({ preventScroll: true });

      timerRef.current = setTimeout(() => {
        setAnnouncement(pendingRemoval.message);
        timerRef.current = null;
      }, FOCUS_SETTLE_MS);
    }, DIALOG_EXIT_MS);

    setPendingRemoval(null);
  }, [clearPendingTimer, items, pendingRemoval]);

  return { announcement, scheduleRemovalFeedback };
}
