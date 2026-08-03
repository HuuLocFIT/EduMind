import React from 'react';
import type { LessonResponse } from '@edumind/shared-types';
import { InlineQuizTaker } from '../../../../components/learning/InlineQuizTaker';
import { LessonNavigation } from './LessonNavigation';

export interface QuizLessonContentProps {
  lesson: LessonResponse;
  lessonHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  onQuizPass: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export const QuizLessonContent: React.FC<QuizLessonContentProps> = ({
  lesson,
  lessonHeadingRef,
  onQuizPass,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}) => {
  return (
    <div className={`p-3 sm:p-6 bg-white ${className ?? ''}`} data-testid="lesson-content">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 ref={lessonHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-1">{lesson.title}</h2>
          {lesson.description && (
            <p className="text-gray-600">{lesson.description}</p>
          )}
        </div>
        <InlineQuizTaker
          key={lesson.id}
          lesson={lesson}
          onQuizPass={onQuizPass}
        />
        <LessonNavigation
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={onPrevious}
          onNext={onNext}
          className="mt-8"
        />
      </div>
    </div>
  );
};
