import React from 'react';
import { Card, Button, ProgressBar } from '@edumind/user-ui';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen } from 'lucide-react';

interface EnrollmentCardProps {
  enrollment: EnrollmentResponse;
  onClick: () => void;
}

export const EnrollmentCard: React.FC<EnrollmentCardProps> = ({ enrollment, onClick }) => {
    const progressPercentage = enrollment.progressPercentage || 0;
  
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="w-32 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {enrollment.courseThumbnail ? (
              <img
                src={enrollment.courseThumbnail}
                alt={enrollment.courseTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
  
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
              {enrollment.courseTitle}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {enrollment.completedLessons || 0} / {enrollment.totalLessons || 0} lessons
            </p>
  
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  {progressPercentage}%
                </span>
              </div>
              <ProgressBar
                progress={progressPercentage}
                size="sm"
                color={progressPercentage === 100 ? 'green' : 'blue'}
              />
            </div>
          </div>
  
          {/* Action */}
          <div className="flex items-center">
            <Button variant="primary" size="sm">
              Continue
            </Button>
          </div>
        </div>
      </Card>
    );
  };