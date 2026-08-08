import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LessonResponse } from '@edumind/shared-types';

/**
 * Owns the course-player's responsive layout state (sidebar open/closed,
 * desktop breakpoint) and the DOM-focused side effects that follow a lesson
 * change: scrolling the window to top, scrolling the active lesson into view
 * inside the sidebar's scroll container, and moving keyboard focus to the
 * lesson heading when a navigation action requested it.
 */
export function useCoursePlayerLayout(currentLesson: LessonResponse | null) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const lessonHeadingRef = useRef<HTMLHeadingElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const activeLessonRef = useRef<HTMLButtonElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const skipSidebarScroll = useRef(false);
  const pendingLessonFocusRef = useRef(false);

  // Shared helper for moving focus to the lesson heading (used after
  // cancelling an auto-advance and after dismissing the completion dialog).
  const focusLessonHeading = useCallback(() => {
    requestAnimationFrame(() => {
      lessonHeadingRef.current?.focus();
    });
  }, []);

  // Track the >=1280px breakpoint and force the sidebar open on desktop.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    if (mediaQuery.matches) {
      setSidebarOpen(true);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    }
  }, [isDesktop]);

  // Scroll to the top of the page whenever the lesson changes.
  useEffect(() => {
    if (!currentLesson) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentLesson?.id]);

  // Move keyboard focus to the lesson heading after a navigation action that
  // requested it (see pendingLessonFocusRef).
  useEffect(() => {
    if (!currentLesson || !pendingLessonFocusRef.current) return;

    const frame = requestAnimationFrame(() => {
      lessonHeadingRef.current?.focus();
      pendingLessonFocusRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [currentLesson?.id, sidebarOpen]);

  // Scroll the active lesson into view inside the sidebar scroll container.
  useLayoutEffect(() => {
    if (!currentLesson || !sidebarOpen) return;
    if (skipSidebarScroll.current) {
      skipSidebarScroll.current = false;
      return;
    }
    const container = sidebarScrollRef.current;
    const item = activeLessonRef.current;
    if (!container || !item) return;

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;

    if (itemTop < containerTop || itemBottom > containerBottom) {
      container.scrollTop = itemTop - container.clientHeight / 2 + item.offsetHeight / 2;
    }
  }, [currentLesson?.id, sidebarOpen]);

  return {
    sidebarOpen,
    setSidebarOpen,
    isDesktop,
    lessonHeadingRef,
    sidebarToggleRef,
    activeLessonRef,
    sidebarScrollRef,
    skipSidebarScroll,
    pendingLessonFocusRef,
    focusLessonHeading,
  };
}
