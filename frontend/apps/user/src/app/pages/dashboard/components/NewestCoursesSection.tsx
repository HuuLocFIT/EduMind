import React from 'react';
import type { CourseResponse } from '@edumind/shared-types';
import { CourseGrid } from '../../../components/course-module';
import { CourseGridSkeleton } from '../../../components/course-module';
import { AlertCircle, Sparkles, ChevronRight, RefreshCw } from 'lucide-react';

interface NewestCoursesSectionProps {
  courses: CourseResponse[];
  onViewCourse: (course: CourseResponse) => void;
  onViewAll: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const NewestCoursesSection: React.FC<NewestCoursesSectionProps> = ({
  courses,
  onViewCourse,
  onViewAll,
  isLoading,
  isError,
  onRetry,
}) => {
  return (
    <div className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            New Arrivals
          </h2>
          <p className="text-slate-500 text-sm mt-1">Fresh content just for you</p>
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
        <CourseGridSkeleton count={4} columns={4} />
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" aria-hidden="true" />
          <p className="font-semibold text-slate-900">Could not load newest courses</p>
          <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : courses.length > 0 ? (
        <CourseGrid courses={courses} onCourseClick={onViewCourse} columns={4} />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No new courses are available right now.</p>
      )}
    </div>
  );
};
