import React from 'react';
import type { CourseResponse } from '@edumind/shared-types';
import { CourseGrid } from '../../../components/course-module';
import { Sparkles, ChevronRight } from 'lucide-react';

interface NewestCoursesSectionProps {
  courses: CourseResponse[];
  onViewCourse: (course: CourseResponse) => void;
  onViewAll: () => void;
}

export const NewestCoursesSection: React.FC<NewestCoursesSectionProps> = ({
  courses,
  onViewCourse,
  onViewAll,
}) => {
  if (courses.length === 0) return null;

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
          onClick={onViewAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <CourseGrid
        courses={courses}
        onCourseClick={onViewCourse}
        columns={4}
      />
    </div>
  );
};
