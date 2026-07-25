import React from "react";
import { GridSkeleton } from "../../teacher/courses/list/Skeletons";

export const TeacherCoursesSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header — mirrors TeacherCoursesPage.tsx:219-232 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
        <div>
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-5 w-64 bg-gray-200 rounded mt-1" />
        </div>
        <div className="h-10 w-[152px] bg-gray-200 rounded-lg flex-shrink-0" />
      </div>

      {/* Filters Bar — mirrors FiltersBar component */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 w-full sm:w-32 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg flex-shrink-0" />
        </div>
      </div>

      {/* Grid Content */}
      <GridSkeleton />
    </div>
  );
};

export default TeacherCoursesSkeleton;
