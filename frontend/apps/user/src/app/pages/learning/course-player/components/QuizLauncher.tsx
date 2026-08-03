import React from 'react';
import { Button } from '@edumind/user-ui';
import { BookOpen } from 'lucide-react';

export interface QuizLauncherProps {
  hasQuiz: boolean | null;
  onOpen: () => void;
  className?: string;
}

export const QuizLauncher: React.FC<QuizLauncherProps> = ({ hasQuiz, onOpen, className }) => {
  return (
    <div className={`mb-6 ${className ?? ''}`}>
      <Button
        variant="primary"
        onClick={onOpen}
        disabled={hasQuiz !== true}
        className="flex items-center gap-2"
      >
        <BookOpen className="w-4 h-4" />
        Take Quiz
      </Button>
      {hasQuiz === null && (
        <p className="text-xs text-gray-400 mt-1">Checking quiz availability…</p>
      )}
      {hasQuiz === false && (
        <p className="text-xs text-gray-500 mt-1">
          No quiz available for this lesson yet.
        </p>
      )}
    </div>
  );
};
