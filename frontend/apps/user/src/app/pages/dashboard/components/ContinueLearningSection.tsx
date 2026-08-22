import React from "react";
import type { EnrollmentResponse } from "@edumind/shared-types";
import { AlertCircle, BookOpen, ChevronRight, RefreshCw } from "lucide-react";
import { DashboardEnrollmentCard } from "./DashboardEnrollmentCard";
import { DashboardEnrollmentCardSkeleton } from "../../../components/route-skeletons/DashboardEnrollmentCardSkeleton";

interface ContinueLearningSectionProps {
  enrollments: EnrollmentResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onContinue: (enrollment: EnrollmentResponse) => void;
  onViewAll: () => void;
  onBrowseCourses: () => void;
}

export const ContinueLearningSection: React.FC<
  ContinueLearningSectionProps
> = ({
  enrollments,
  isLoading,
  isError,
  onRetry,
  onContinue,
  onViewAll,
  onBrowseCourses,
}) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Continue Learning
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Pick up where you left off
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex self-start items-center gap-2 py-1 text-slate-800 font-semibold transition-colors hover:text-blue-600 sm:self-auto sm:px-4 sm:py-2 sm:bg-white sm:border sm:border-slate-200 sm:rounded-xl sm:text-slate-700 sm:font-medium sm:hover:bg-slate-50 sm:hover:text-slate-700"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div
          className="space-y-4 animate-pulse motion-reduce:animate-none"
          aria-label="Loading recent courses"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <DashboardEnrollmentCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-white p-8 text-center"
        >
          <AlertCircle
            className="mx-auto mb-3 h-8 w-8 text-red-500"
            aria-hidden="true"
          />
          <h3 className="font-semibold text-slate-900">
            Could not load your recent courses
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Please try again to continue learning.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : enrollments.length > 0 ? (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <DashboardEnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              onContinue={() => onContinue(enrollment)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No courses yet
          </h3>
          <p className="text-slate-500 mb-4">
            Start learning by enrolling in a course
          </p>
          <button
            onClick={onBrowseCourses}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
          >
            Browse Courses
          </button>
        </div>
      )}
    </div>
  );
};
