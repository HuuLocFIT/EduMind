import { useState } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import { ContentType } from '@edumind/shared-constants';
import type { LessonProgressResponse, LessonResponse } from '@edumind/shared-types';
import type { LessonClickOptions } from '../course-player.types';
import { getAdjacentLessons } from '../course-player.utils';
import { prefetchLessonQuiz, prefetchLessonSummary } from '../../../../lib/prefetch';

interface UseLessonNavigationOptions {
  courseSlug: string | undefined;
  currentLesson: LessonResponse | null;
  setCurrentLesson: (lesson: LessonResponse) => void;
  lessons: LessonResponse[];
  allLessonProgress: LessonProgressResponse[];
  isDesktop: boolean;
  setSearchParams: SetURLSearchParams;
  pendingLessonFocusRef: MutableRefObject<boolean>;
  lessonHeadingRef: RefObject<HTMLHeadingElement | null>;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setVideoProgress: (progress: number) => void;
  setLessonHasQuiz: (hasQuiz: boolean | null) => void;
  /**
   * Called first, before anything else, whenever a lesson change is about to
   * happen. The page composes this from its still-inline auto-advance/video/
   * autosave logic (cancel auto-advance, pause + reset the video, stop the
   * progress autosave interval). Kept as a callback so this hook never has to
   * import the video-progress or completion hooks directly.
   */
  onBeforeLessonChange: () => void;
}

/**
 * Owns lesson-to-lesson navigation: resolving the previous/next lesson,
 * selecting a lesson (updating the query param, localStorage, video progress
 * reset, and screen-reader announcements), and the previous/next handlers
 * used by the lesson-navigation buttons and the auto-advance banner.
 */
export function useLessonNavigation({
  courseSlug,
  currentLesson,
  setCurrentLesson,
  lessons,
  allLessonProgress,
  isDesktop,
  setSearchParams,
  pendingLessonFocusRef,
  lessonHeadingRef,
  setSidebarOpen,
  setVideoProgress,
  setLessonHasQuiz,
  onBeforeLessonChange,
}: UseLessonNavigationOptions) {
  const [lessonAnnouncement, setLessonAnnouncement] = useState('');
  const queryClient = useQueryClient();

  const { previous: previousLesson, next: nextLesson } = getAdjacentLessons(
    lessons,
    currentLesson?.id
  );

  const selectLesson = (lesson: LessonResponse, options: LessonClickOptions = {}) => {
    const isCurrentLesson = currentLesson?.id === lesson.id;

    // Any manual navigation cancels a pending auto-advance timer, pauses the
    // current video and clears the progress-autosave interval — composed by
    // the page from the still-inline video/auto-advance orchestration.
    onBeforeLessonChange();

    // Kick off the quiz fetch immediately, before QuizTakerContent even
    // mounts, so a revisit within this session is a cache hit (no loading
    // flash) and a first visit's request starts a beat earlier.
    if (lesson.contentType === ContentType.QUIZ) {
      prefetchLessonQuiz(queryClient, lesson.id);
    } else if (
      lesson.contentType === ContentType.ARTICLE ||
      lesson.contentType === ContentType.VIDEO
    ) {
      prefetchLessonSummary(queryClient, lesson.id);
    }

    pendingLessonFocusRef.current = options.focusContent ?? true;
    setCurrentLesson(lesson);
    setSearchParams({ lesson: lesson.id.toString(), type: lesson.contentType }, { replace: true });
    localStorage.setItem(`course_${courseSlug}_last_lesson`, lesson.id.toString());
    localStorage.setItem(`course_${courseSlug}_last_lesson_type`, lesson.contentType);
    localStorage.setItem(`lesson_${lesson.id}_type`, lesson.contentType);
    const savedProgress = allLessonProgress.find((p) => p.lessonId === lesson.id);
    setVideoProgress(savedProgress?.watchPercentage ?? 0);
    setLessonHasQuiz(null);
    setLessonAnnouncement(`Opened lesson: ${lesson.title}`);
    if (options.closeMobileSidebar) {
      setSidebarOpen(false);
    } else if (isCurrentLesson && pendingLessonFocusRef.current) {
      requestAnimationFrame(() => {
        lessonHeadingRef.current?.focus();
        pendingLessonFocusRef.current = false;
      });
    }
  };

  const navigateNext = () => {
    if (nextLesson) {
      selectLesson(nextLesson, { focusContent: true, closeMobileSidebar: !isDesktop });
    }
  };

  const navigatePrevious = () => {
    if (previousLesson) {
      selectLesson(previousLesson, { focusContent: true, closeMobileSidebar: !isDesktop });
    }
  };

  return {
    lessonAnnouncement,
    setLessonAnnouncement,
    nextLesson,
    previousLesson,
    selectLesson,
    navigateNext,
    navigatePrevious,
  };
}
