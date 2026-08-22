import React from 'react';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen, ChevronRight } from 'lucide-react';
import { CloudinaryImage } from '@edumind/user-ui';

interface DashboardEnrollmentCardProps {
  enrollment: EnrollmentResponse;
  onContinue: () => void;
}

export const DashboardEnrollmentCard: React.FC<DashboardEnrollmentCardProps> = ({
  enrollment,
  onContinue,
}) => {
  const progressPercentage = enrollment.progressPercentage || 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row">
        {/* Course Image */}
        <div className="relative h-40 flex-shrink-0 overflow-hidden bg-slate-100 sm:h-auto sm:w-44">
          <CloudinaryImage
            src={enrollment.courseThumbnail}
            alt={enrollment.courseTitle}
            widths={[480, 960]}
            sizes="(max-width: 640px) calc(100vw - 2rem), 176px"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!enrollment.courseThumbnail && (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="w-16 h-16 text-slate-400" />
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex-1">
              <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900">
                {enrollment.courseTitle}
              </h3>
              <p className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {enrollment.completedLessons || 0} of {enrollment.totalLessons || 0} lessons completed
              </p>

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Progress</span>
              <span className="font-semibold text-blue-600">{progressPercentage}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${enrollment.courseTitle} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercentage}>
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={onContinue}
                aria-label={`${progressPercentage === 0 ? 'Start' : 'Continue'} ${enrollment.courseTitle}`}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {progressPercentage === 0 ? 'Start' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
};
