import React from 'react';
import { Button } from '@edumind/user-ui';

export interface AutoAdvanceBannerProps {
  nextLessonTitle: string;
  secondsRemaining: number;
  onGoNow: () => void;
  onCancel: () => void;
  className?: string;
}

export const AutoAdvanceBanner: React.FC<AutoAdvanceBannerProps> = ({
  nextLessonTitle,
  secondsRemaining,
  onGoNow,
  onCancel,
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`p-3 sm:p-6 bg-white ${className ?? ''}`}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-900">
          Lesson completed. Moving to {nextLessonTitle} in {secondsRemaining} seconds.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="primary" onClick={onGoNow}>
            Go to next lesson now
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel auto-advance
          </Button>
        </div>
      </div>
    </div>
  );
};
