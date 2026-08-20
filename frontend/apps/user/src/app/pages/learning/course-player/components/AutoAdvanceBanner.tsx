import React, { useEffect, useId, useRef } from 'react';
import { Button } from '@edumind/user-ui';

export interface AutoAdvanceBannerProps {
  nextLessonTitle: string;
  secondsRemaining: number;
  announcement: string;
  onGoNow: () => void;
  onCancel: () => void;
  className?: string;
}

export const AutoAdvanceBanner: React.FC<AutoAdvanceBannerProps> = ({
  nextLessonTitle,
  secondsRemaining,
  announcement,
  onGoNow,
  onCancel,
  className,
}) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const announcementId = useId();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      bannerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={bannerRef} className={`p-3 sm:p-6 bg-white ${className ?? ''}`}>
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-900">
          Lesson completed. Moving to {nextLessonTitle} in {secondsRemaining} seconds.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="primary" onClick={onGoNow} aria-describedby={announcementId}>
            Go to next lesson now
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel auto-advance
          </Button>
        </div>
        <p id={announcementId} className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
};
