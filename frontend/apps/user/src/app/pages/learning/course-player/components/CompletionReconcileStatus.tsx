import React from 'react';
import { Button } from '@edumind/user-ui';

export interface CompletionReconcileStatusProps {
  inFlight: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  className?: string;
}

export const CompletionReconcileStatus: React.FC<CompletionReconcileStatusProps> = ({
  inFlight,
  error,
  onRetry,
  className,
}) => {
  return (
    <section aria-label="Course progress refresh status" className={`px-3 sm:px-6 bg-white ${className ?? ''}`}>
      <div className="max-w-4xl mx-auto py-4">
        {inFlight && (
          <p role="status">Refreshing course progress…</p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <p>{error.message}</p>
            <Button
              variant="secondary"
              onClick={onRetry}
              aria-label="Retry refreshing course progress"
              className="flex-shrink-0"
            >
              Retry refresh
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
