import React from 'react';
import type { LessonResponse } from '@edumind/shared-types';
import { InlineQuizTaker } from '../../../../components/learning/InlineQuizTaker';

export interface QuizLessonContentProps {
  lesson: LessonResponse;
  lessonHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  onQuizPass: () => void;
  className?: string;
}

export const QuizLessonContent: React.FC<QuizLessonContentProps> = ({
  lesson,
  lessonHeadingRef,
  onQuizPass,
  className,
}) => {
  return (
    <div className={`p-3 sm:p-6 pb-28 bg-white ${className ?? ''}`} data-testid="lesson-content">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 ref={lessonHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-1">{lesson.title}</h2>
          {lesson.description && (
            <p className="text-gray-600">{lesson.description}</p>
          )}
        </div>
        <InlineQuizTaker
          lesson={lesson}
          onQuizPass={onQuizPass}
        />
      </div>
    </div>
  );
};
