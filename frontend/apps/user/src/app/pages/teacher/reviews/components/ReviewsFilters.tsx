import React from "react";
import { Filter, SortAsc, SortDesc, RefreshCw } from "lucide-react";
import type { FilterTab } from "../types/reviews.types";
import type { InstructorReviewsStatsResponse, CourseWithReviews } from "@edumind/shared-types";

interface ReviewsFiltersProps {
  tabs: { key: FilterTab; label: string; count?: number }[];
  statusFilter: FilterTab;
  courseFilter: string;
  ratingFilter: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  loading: boolean;
  courses: CourseWithReviews[];
  onStatusTabClick: (tabKey: FilterTab) => void;
  onCourseFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRatingFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortByChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortDirToggle: () => void;
  onRefresh: () => void;
}

export const ReviewsFilters: React.FC<ReviewsFiltersProps> = ({
  tabs,
  statusFilter,
  courseFilter,
  ratingFilter,
  sortBy,
  sortDir,
  loading,
  courses,
  onStatusTabClick,
  onCourseFilterChange,
  onRatingFilterChange,
  onSortByChange,
  onSortDirToggle,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusTabClick(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key || (tab.key === "all" && !statusFilter)
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={onCourseFilterChange}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        {/* Rating Filter */}
        <select
          value={ratingFilter}
          onChange={onRatingFilterChange}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} Star{r > 1 ? "s" : ""}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={onSortByChange}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt">Date</option>
            <option value="rating">Rating</option>
          </select>
          <button
            onClick={onSortDirToggle}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={sortDir === "desc" ? "Newest first" : "Oldest first"}
          >
            {sortDir === "desc" ? (
              <SortDesc className="w-4 h-4" />
            ) : (
              <SortAsc className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
};

