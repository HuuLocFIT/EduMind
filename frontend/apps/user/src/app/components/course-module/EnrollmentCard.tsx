import React from 'react';
import { Card, Button, ProgressBar, CloudinaryImage } from '@edumind/user-ui';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen } from 'lucide-react';

interface EnrollmentCardProps {
  enrollment: EnrollmentResponse;
  onClick: () => void;
}

export const EnrollmentCard: React.FC<EnrollmentCardProps> = ({ enrollment, onClick }) => {
  const progressPercentage = enrollment.progressPercentage || 0;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        {/* Thumbnail */}
        <div className="w-full h-40 bg-gray-200 rounded-lg overflow-hidden sm:w-32 sm:h-20 flex-shrink-0">
          <CloudinaryImage
            src={enrollment.courseThumbnail}
            alt={enrollment.courseTitle}
            widths={[320, 640]}
            sizes="(max-width: 640px) calc(100vw - 3rem), 128px"
            className="w-full h-full object-cover"
          />
          {!enrollment.courseThumbnail && (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 sm:line-clamp-1">
            {enrollment.courseTitle}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {enrollment.completedLessons || 0} / {enrollment.totalLessons || 0} lessons
          </p>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{progressPercentage}%</span>
            </div>
            <ProgressBar
              progress={progressPercentage}
              size="sm"
              color={progressPercentage === 100 ? 'green' : 'blue'}
            />
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center sm:self-stretch">
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
};