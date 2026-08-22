import React from "react";
import type { EnrollmentResponse } from "@edumind/shared-types";
import { EnrollmentStatus } from "@edumind/shared-constants";
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
} from "lucide-react";
import { CloudinaryImage } from "@edumind/user-ui";
import { formatDate } from "@edumind/shared-utils";
import { formatLastAccessed } from "../utils/formatLastAccessed";

interface MyLearningEnrollmentCardProps {
  enrollment: EnrollmentResponse;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onContinue: () => void;
  onViewDetails: () => void;
}

export const MyLearningEnrollmentCard: React.FC<
  MyLearningEnrollmentCardProps
> = ({
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
    ? "Suspended"
    : isCompleted
      ? "Completed"
      : progressPercentage > 0
        ? "In progress"
        : "New";
  const courseMetadata = [
    `${enrollment.totalLessons || 0} lessons`,
    enrollment.lastAccessedAt
      ? formatLastAccessed(enrollment.lastAccessedAt)
      : null,
  ]
    .filter(Boolean)
    .join(". ");
  const completionText = `${enrollment.completedLessons || 0} of ${enrollment.totalLessons || 0} lessons completed`;
  const enrollmentText = `Enrolled ${formatDate(enrollment.enrolledAt)}`;

  return (
    <article
      data-testid="enrollment-card"
      className={`group max-w-full overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        isSuspended
          ? "opacity-70 border-amber-300 bg-amber-50"
          : "border-slate-200 hover:shadow-xl hover:border-blue-200"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-labelledby={`course-${enrollment.id}-title`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Course Image */}
        <div className="relative aspect-video w-full flex-shrink-0 overflow-hidden bg-slate-100 md:aspect-auto md:w-56">
          <CloudinaryImage
            src={enrollment.courseThumbnail}
            alt=""
            aria-hidden="true"
            widths={[480, 960]}
            sizes="(max-width: 768px) calc(100vw - 2rem), 224px"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {!enrollment.courseThumbnail && (
            <div
              className="flex items-center justify-center h-full"
              aria-hidden="true"
            >
              <BookOpen className="w-16 h-16 text-slate-400" />
            </div>
          )}
          <div
            className={`absolute inset-0 hidden items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 md:flex ${
              isHovered && !isSuspended ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={onContinue}
              aria-hidden="true"
              tabIndex={-1}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              <Play
                className="w-6 h-6 text-blue-600 fill-current ml-1"
                aria-hidden="true"
              />
            </button>
          </div>
          {/* Status Badge */}
          <div className="absolute left-3 top-3" aria-hidden="true">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm sm:px-3 sm:py-1.5 ${
                isSuspended
                  ? "bg-amber-700 text-white"
                  : isCompleted
                    ? "bg-emerald-700 text-white"
                    : progressPercentage > 0
                      ? "bg-blue-700 text-white"
                      : "bg-amber-700 text-white"
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
        </div>

        {/* Course Info */}
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 sm:pr-4">
              <h3
                id={`course-${enrollment.id}-title`}
                className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 sm:text-xl md:text-lg"
              >
                {enrollment.courseTitle}
              </h3>
              <p className="sr-only">{statusLabel}</p>
              <p className="sr-only">{courseMetadata}</p>
              <div
                className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500"
                aria-hidden="true"
              >
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <BookOpen className="w-4 h-4" />
                  {enrollment.totalLessons || 0} lessons
                </span>
                {enrollment.lastAccessedAt && (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    {formatLastAccessed(enrollment.lastAccessedAt)}
                  </span>
                )}
              </div>
            </div>
            <div
              className="flex flex-shrink-0 items-baseline justify-between gap-2 sm:block sm:text-right"
              aria-hidden="true"
            >
              <span className="text-sm font-medium text-slate-500 sm:hidden">
                Progress
              </span>
              <p className="text-blue-600">
                <span className="text-2xl font-bold sm:text-3xl">
                  {progressPercentage}%
                </span>{" "}
                <span className="text-xs text-slate-500">progress</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 md:flex-1">
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
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : progressPercentage > 0
                      ? "bg-gradient-to-r from-blue-600 to-blue-400"
                      : "bg-slate-200"
                }`}
                style={{
                  width:
                    progressPercentage === 0
                      ? "0%"
                      : `${Math.max(progressPercentage, 2)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {completionText}
            </p>
          </div>

          {/* CTA */}
          <div className="flex min-w-0 flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {enrollmentText}
            </p>
            <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                onClick={onViewDetails}
                aria-label={`View details for ${enrollment.courseTitle}`}
                className="flex min-h-11 min-w-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:flex-none"
              >
                Details
              </button>
              {isSuspended ? (
                <button
                  disabled
                  aria-label={`${enrollment.courseTitle} is suspended`}
                  className="flex min-h-11 min-w-0 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 sm:flex-none sm:px-5"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Suspended
                </button>
              ) : (
                <button
                  data-testid="continue-learning-button"
                  onClick={onContinue}
                  aria-label={`${progressPercentage === 0 ? "Start" : "Continue"} learning ${enrollment.courseTitle}`}
                  className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 sm:flex-none sm:px-5 sm:group-hover:scale-105"
                >
                  {progressPercentage === 0 ? "Start" : "Continue"}
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
