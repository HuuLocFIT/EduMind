import React from 'react';
import { Button } from '@edumind/user-ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface LessonNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export const LessonNavigation: React.FC<LessonNavigationProps> = ({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}) => {
  return (
    <div className={`w-full grid grid-cols-2 gap-3 sm:gap-4 ${className ?? ''}`}>
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="justify-self-start w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
      >
        <ChevronLeft className="w-5 h-5 mr-2" />
        <span className="sm:hidden">Previous</span>
        <span className="hidden sm:inline">Previous Lesson</span>
      </Button>

      <Button
        variant="primary"
        onClick={onNext}
        disabled={!hasNext}
        className="justify-self-end w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
      >
        <span className="sm:hidden">Next</span>
        <span className="hidden sm:inline">Next Lesson</span>
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
