import React from 'react';
import { Button } from '@edumind/user-ui';

export interface ProgressSaveStatusProps {
  state: 'idle' | 'saving' | 'error';
  error: { message: string } | null;
  onRetry: () => void;
  className?: string;
}

export const ProgressSaveStatus: React.FC<ProgressSaveStatusProps> = ({
  state,
  error,
  onRetry,
  className,
}) => {
  return (
    <section aria-label="Video progress save status" className={`px-3 sm:px-6 ${className ?? ''}`}>
      <div className="max-w-4xl mx-auto">
        {state === 'saving' && (
          <p role="status" className="text-sm text-gray-300 py-2">
            Saving video progress…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 my-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <p>{error.message}</p>
            <Button
              variant="secondary"
              onClick={onRetry}
              aria-label="Retry saving video progress"
              className="flex-shrink-0"
            >
              Retry saving progress
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
