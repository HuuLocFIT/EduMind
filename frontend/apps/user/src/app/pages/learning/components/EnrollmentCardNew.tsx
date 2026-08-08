import React from 'react';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { EnrollmentStatus } from '@edumind/shared-constants';
import {
  BookOpen,
  Clock,
  Play,
  TrendingUp,
  ChevronRight,
  Lock,
  Calendar,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { CloudinaryImage } from '@edumind/user-ui';
import { formatDate } from '@edumind/shared-utils';
import { formatLastAccessed } from '../utils/formatLastAccessed';

interface EnrollmentCardNewProps {
  enrollment: EnrollmentResponse;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onContinue: () => void;
  onViewDetails: () => void;
}

export const EnrollmentCardNew: React.FC<EnrollmentCardNewProps> = ({
  enrollment,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onContinue,
  onViewDetails,
}) => {
  const progressPercentage = enrollment.progressPercentage || 0;
  const isCompleted = enrollment.status === EnrollmentStatus.COMPLETED;
  const isSuspended = enrollment.status === EnrollmentStatus.SUSPENDED;
  const statusLabel = isSuspended
    ? 'Suspended'
    : isCompleted
    ? 'Completed'
    : progressPercentage > 0
    ? 'In progress'
    : 'New';
  const courseMetadata = [
    `${enrollment.totalLessons || 0} lessons`,
    enrollment.lastAccessedAt ? formatLastAccessed(enrollment.lastAccessedAt) : null,
  ].filter(Boolean).join('. ');
  const completionText = `${enrollment.completedLessons || 0} of ${enrollment.totalLessons || 0} lessons completed`;
  const enrollmentText = `Enrolled ${formatDate(enrollment.enrolledAt)}`;

  return (
    <article
      data-testid="enrollment-card"
      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 group ${
        isSuspended
          ? 'opacity-70 border-amber-300 bg-amber-50'
          : 'border-slate-200 hover:shadow-xl hover:border-blue-200'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-labelledby={`course-${enrollment.id}-title`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Course Image */}
        <div className="relative md:w-56 h-44 md:h-auto md:aspect-video flex-shrink-0 overflow-hidden bg-slate-100">
          <CloudinaryImage
            src={enrollment.courseThumbnail}
            alt=""
            aria-hidden="true"
            widths={[480, 960]}
            sizes="(max-width: 768px) calc(100vw - 2rem), 224px"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {!enrollment.courseThumbnail && (
            <div className="flex items-center justify-center h-full" aria-hidden="true">
              <BookOpen className="w-16 h-16 text-slate-400" />
            </div>
          )}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center transition-opacity duration-300 ${
              isHovered && !isSuspended ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={onContinue}
              aria-hidden="true"
              tabIndex={-1}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play className="w-6 h-6 text-blue-600 fill-current ml-1" aria-hidden="true" />
            </button>
          </div>
          {/* Status Badge */}
          <div className="absolute top-3 left-3" aria-hidden="true">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                isSuspended
                  ? 'bg-amber-700 text-white'
                  : isCompleted
                  ? 'bg-emerald-700 text-white'
                  : progressPercentage > 0
                  ? 'bg-blue-700 text-white'
                  : 'bg-amber-700 text-white'
              }`}
            >
              {isSuspended ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Suspended
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </>
              ) : progressPercentage > 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  In Progress
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  New
                </>
              )}
            </span>
          </div>
          {/* Free Badge */}
          {!enrollment.courseIsPaid && (
            <div className="absolute top-3 right-3" aria-hidden="true">
              <span className="bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full">FREE</span>
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-4">
              <h3 id={`course-${enrollment.id}-title`} className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                {enrollment.courseTitle}
              </h3>
              <p className="sr-only">
                {statusLabel}. {enrollment.courseIsPaid ? 'Paid course' : 'Free course'}
              </p>
              <p className="sr-only">{courseMetadata}</p>
              <div className="flex items-center gap-3 text-sm text-slate-500" aria-hidden="true">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {enrollment.totalLessons || 0} lessons
                </span>
                {enrollment.lastAccessedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatLastAccessed(enrollment.lastAccessedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0" aria-hidden="true">
              <p className="text-blue-600">
                <span className="text-3xl font-bold">{progressPercentage}%</span>{' '}
                <span className="text-slate-500 text-xs">progress</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 flex-1">
            <div
              className="h-3 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-label={`${enrollment.courseTitle} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercentage}
              aria-valuetext={`${progressPercentage}% complete`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : progressPercentage > 0
                    ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                    : 'bg-slate-200'
                }`}
                style={{ width: `${Math.max(progressPercentage, 2)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500 font-medium">{completionText}</p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {enrollmentText}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onViewDetails}
                aria-label={`View details for ${enrollment.courseTitle}`}
                className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Details
              </button>
              {isSuspended ? (
                <button
                  disabled
                  aria-label={`${enrollment.courseTitle} is suspended`}
                  className="bg-slate-200 text-slate-500 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Suspended
                </button>
              ) : (
                <button
                  data-testid="continue-learning-button"
                  onClick={onContinue}
                  aria-label={`${progressPercentage === 0 ? 'Start' : 'Continue'} learning ${enrollment.courseTitle}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 group-hover:scale-105"
                >
                  {progressPercentage === 0 ? 'Start' : 'Continue'}
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
