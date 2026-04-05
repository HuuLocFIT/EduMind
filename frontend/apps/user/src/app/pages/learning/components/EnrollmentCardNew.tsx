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

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 group ${
        isSuspended
          ? 'opacity-70 border-amber-300 bg-amber-50'
          : 'border-slate-200 hover:shadow-xl hover:border-blue-200'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col md:flex-row">
        {/* Course Image */}
        <div className="relative md:w-56 h-44 md:h-auto md:aspect-video flex-shrink-0 overflow-hidden bg-slate-100">
          <CloudinaryImage
            src={enrollment.courseThumbnail}
            alt={enrollment.courseTitle}
            widths={[480, 960]}
            sizes="(max-width: 768px) calc(100vw - 2rem), 224px"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {!enrollment.courseThumbnail && (
            <div className="flex items-center justify-center h-full">
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
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play className="w-6 h-6 text-blue-600 fill-current ml-1" />
            </button>
          </div>
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                isSuspended
                  ? 'bg-amber-500 text-white'
                  : isCompleted
                  ? 'bg-emerald-500 text-white'
                  : progressPercentage > 0
                  ? 'bg-blue-500 text-white'
                  : 'bg-amber-500 text-white'
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
            <div className="absolute top-3 right-3">
              <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">FREE</span>
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                {enrollment.courseTitle}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-500">
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
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-blue-600">{progressPercentage}%</p>
              <p className="text-slate-400 text-xs">progress</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 flex-1">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
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
            <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
              <span className="font-medium">
                {enrollment.completedLessons || 0} of {enrollment.totalLessons || 0} lessons completed
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              Enrolled {formatDate(enrollment.enrolledAt)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onViewDetails}
                className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Details
              </button>
              {isSuspended ? (
                <button
                  disabled
                  className="bg-slate-200 text-slate-500 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  Suspended
                </button>
              ) : (
                <button
                  onClick={onContinue}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 group-hover:scale-105"
                >
                  {progressPercentage === 0 ? 'Start' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
