import React from 'react';
import { Button } from '@edumind/user-ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface LessonNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousLessonTitle?: string;
  nextLessonTitle?: string;
  className?: string;
}

/**
 * Sticky bottom bar within the lesson content column (see CoursePlayerPage.tsx,
 * which mounts this once, always, as the last child of #course-player-main —
 * a stable sibling of the skeleton/content swap, not nested inside it).
 * Article length, quiz question count, and the AI summary panel's loaded
 * height are all impossible to predict from a skeleton — keeping
 * Previous/Next out of that swapped subtree means none of that variance can
 * shift or remount these buttons. `sticky` (rather than `fixed`) keeps it
 * scoped to #course-player-main's own box, so it never overlaps the site
 * footer that sits below <main> in MainLayout.
 */
export const LessonNavigation: React.FC<LessonNavigationProps> = ({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  previousLessonTitle,
  nextLessonTitle,
  className,
}) => {
  const previousLabel = hasPrevious
    ? previousLessonTitle
      ? `Previous Lesson: ${previousLessonTitle}`
      : 'Previous Lesson'
    : 'Previous Lesson, unavailable, this is the first lesson';
  const nextLabel = hasNext
    ? nextLessonTitle
      ? `Next Lesson: ${nextLessonTitle}`
      : 'Next Lesson'
    : 'Next Lesson, unavailable, this is the last lesson';

  return (
    <div
      className={`sticky bottom-0 z-30 border-t border-gray-200 bg-gray-50 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-3 py-3 [@media(max-height:32rem)]:gap-2 [@media(max-height:32rem)]:py-1 sm:gap-4 sm:px-6">
        <Button
          variant="primary"
          onClick={onPrevious}
          disabled={!hasPrevious}
          aria-label={previousLabel}
          className={`h-11 w-32 justify-center justify-self-start [@media(max-height:32rem)]:h-10 [@media(max-height:32rem)]:w-full [@media(max-height:32rem)]:px-2 [@media(max-height:32rem)]:text-sm sm:h-12 sm:w-44 md:w-52 ${
            !hasPrevious ? '!opacity-100 !bg-gray-600 !text-white' : ''
          }`}
        >
          <ChevronLeft className="mr-2 h-5 w-5 [@media(max-height:32rem)]:mr-1 [@media(max-height:32rem)]:h-4 [@media(max-height:32rem)]:w-4" aria-hidden="true" />
          <span aria-hidden="true" className="sm:hidden">
            Previous
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            Previous Lesson
          </span>
        </Button>

        <Button
          variant="primary"
          onClick={onNext}
          disabled={!hasNext}
          aria-label={nextLabel}
          className={`h-11 w-32 justify-center justify-self-end [@media(max-height:32rem)]:h-10 [@media(max-height:32rem)]:w-full [@media(max-height:32rem)]:px-2 [@media(max-height:32rem)]:text-sm sm:h-12 sm:w-44 md:w-52 ${
            !hasNext ? '!opacity-100 !bg-gray-600 !text-white' : ''
          }`}
        >
          <span aria-hidden="true" className="sm:hidden">
            Next
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            Next Lesson
          </span>
          <ChevronRight className="ml-2 h-5 w-5 [@media(max-height:32rem)]:ml-1 [@media(max-height:32rem)]:h-4 [@media(max-height:32rem)]:w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
