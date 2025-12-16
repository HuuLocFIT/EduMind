import React from "react";
import { Search } from "lucide-react";
import { EnrollmentStatus } from "@edumind/shared-constants";
import type { CourseResponse } from "@edumind/shared-types";
import type { StudentsFilters } from "../types/students.types";

interface StudentsFiltersProps {
  courses: CourseResponse[];
  coursesLoading: boolean;
  filters: StudentsFilters;
  selectedCourse?: CourseResponse;
  onCourseChange: (courseId: string) => void;
  onStatusChange: (status: string) => void;
  onSearchSubmit: (search: string) => void;
  onClearFilters: () => void;
}

export const StudentsFilters: React.FC<StudentsFiltersProps> = ({
  courses,
  coursesLoading,
  filters,
  selectedCourse,
  onCourseChange,
  onStatusChange,
  onSearchSubmit,
  onClearFilters,
}) => {
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (new FormData(form).get("search") as string) || "";
    onSearchSubmit(value);
  };

  const hasActiveFilters =
    filters.status || filters.search || filters.courseId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Course selector */}
        <div className="w-full lg:w-64">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Course
          </label>
          <select
            value={filters.courseId?.toString() || ""}
            onChange={(e) => onCourseChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            disabled={coursesLoading}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={filters.search || ""}
              placeholder="Search by student ID, name or email"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </form>

        {/* Status filter */}
        <div className="w-full lg:w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <select
            value={filters.status || ""}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Status</option>
            {Object.keys(EnrollmentStatus).map((key) => (
              <option key={key} value={key}>
                {key.charAt(0) + key.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t mt-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {selectedCourse && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
              Course: {selectedCourse.title}
              <button
                type="button"
                onClick={() => onCourseChange("")}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
              Status: {filters.status}
              <button
                type="button"
                onClick={() => onStatusChange("")}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          )}
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
              Search: {filters.search}
              <button
                type="button"
                onClick={() => onSearchSubmit("")}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

