import React from 'react';
import { Button, Card } from '@edumind/user-ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';

interface CourseAccessErrorDialogProps {
  title: string;
  message: string;
  redirectCountdown: number;
  onGoBack: () => void;
  onGoNow: () => void;
}

export const CourseAccessErrorDialog: React.FC<CourseAccessErrorDialogProps> = ({
  title,
  message,
  redirectCountdown,
  onGoBack,
  onGoNow,
}) => {
  const dialogRef = useFocusTrap(true);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="course-access-error-title"
        aria-describedby="course-access-error-description course-access-redirect-note"
        className="max-w-md w-full"
      >
      <Card className="w-full p-6">
        <h1 id="course-access-error-title" className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h1>
        <p id="course-access-error-description" className="text-gray-700 mb-4">
          {message}
        </p>
        <p id="course-access-redirect-note" className="text-xs text-gray-500 mb-6">
          You will be redirected automatically in{' '}
          <span className="font-semibold">{redirectCountdown}</span> seconds.
        </p>
        <div className="flex justify-end gap-2">
          <Button className="order-2" variant="primary" onClick={onGoNow}>
            Go Now
          </Button>
          <Button className="order-1" variant="secondary" onClick={onGoBack}>
            Go Back
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
};
