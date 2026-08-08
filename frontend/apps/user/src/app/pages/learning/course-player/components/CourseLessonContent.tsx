import React from 'react';
import type { LessonResponse, LessonProgressResponse, EnrollmentResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import type { CompletionError } from '../course-player.types';
import { QuizLessonContent } from './QuizLessonContent';
import { StandardLessonContent } from './StandardLessonContent';

export interface CourseLessonContentProps {
  lesson: LessonResponse;
  enrollment: EnrollmentResponse | null;
  currentLessonProgress: LessonProgressResponse | null;
  completingLessonId: number | null;
  completionError: CompletionError | null;
  lessonHasQuiz: boolean | null;
  lessonHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  completionControlsRef: React.RefObject<HTMLDivElement | null>;
  onMarkComplete: () => void;
  onQuizPass: () => void;
  onOpenQuiz: () => void;
  onDownloadTranscript: () => void;
  className?: string;
}

/**
 * Switches between the quiz and standard (article/video) lesson renderers
 * based on the current lesson's content type. `VideoPlayer` is intentionally
 * NOT rendered here — the page keeps it above this content area to preserve
 * the existing layout.
 */
export const CourseLessonContent: React.FC<CourseLessonContentProps> = ({
  lesson,
  enrollment,
  currentLessonProgress,
  completingLessonId,
  completionError,
  lessonHasQuiz,
  lessonHeadingRef,
  completionControlsRef,
  onMarkComplete,
  onQuizPass,
  onOpenQuiz,
  onDownloadTranscript,
  className,
}) => {
  if (lesson.contentType === ContentType.QUIZ) {
    if (!enrollment) return null;
    return (
      <QuizLessonContent
        lesson={lesson}
        lessonHeadingRef={lessonHeadingRef}
        onQuizPass={onQuizPass}
        className={className}
      />
    );
  }

  return (
    <StandardLessonContent
      lesson={lesson}
      currentLessonProgress={currentLessonProgress}
      completingLessonId={completingLessonId}
      completionError={completionError}
      lessonHasQuiz={lessonHasQuiz}
      lessonHeadingRef={lessonHeadingRef}
      completionControlsRef={completionControlsRef}
      onMarkComplete={onMarkComplete}
      onOpenQuiz={onOpenQuiz}
      onDownloadTranscript={onDownloadTranscript}
      className={className}
    />
  );
};
