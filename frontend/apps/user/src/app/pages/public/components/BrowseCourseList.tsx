import React from 'react';
import { Button } from "@edumind/user-ui";
import { CourseGrid, CourseGridSkeleton } from "../../../components/course-module";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { CourseResponse } from "@edumind/shared-types";

interface BrowseCourseListProps {
  isFetching: boolean;
  isLoading: boolean;
  error: any;
  courses: CourseResponse[];
  totalElements: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onRefetch: () => void;
  onPageChange: (page: number) => void;
  
  // Grid actions
  handleCourseClick: (course: CourseResponse) => void;
  enrolledCourseIds: Set<number>;
  cartCourseIds: Set<number>;
  addingIds: Set<number>;
  enrollingIds: Set<number>;
  handleAddToCart: (id: number) => void;
  handleGoToCourse: (courseSlug: string) => void;
  handleEnrollFree: (id: number) => void;

  // Empty state actions
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export const BrowseCourseList: React.FC<BrowseCourseListProps> = ({
  isFetching,
  isLoading,
  error,
  courses,
  totalElements,
  page,
  pageSize,
  totalPages,
  sortBy,
  onSortChange,
  onRefetch,
  onPageChange,
  
  handleCourseClick,
  enrolledCourseIds,
  cartCourseIds,
  addingIds,
  enrollingIds,
  handleAddToCart,
  handleGoToCourse,
  handleEnrollFree,

  activeFiltersCount,
  onClearFilters,
}) => {
  return (
    <main className="flex-1">
      <h2 className="sr-only">Course Results</h2>
      {/* Sort & Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {isFetching ? (
            <div className="flex items-center gap-2 text-gray-600" role="status" aria-label="Loading results">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {totalElements > 0 && (
                <span className="text-gray-700 font-medium" role="status" aria-live="polite">
                  {`${totalElements.toLocaleString()} course${totalElements !== 1 ? 's' : ''} found`}
                </span>
              )}
              {courses.length > 0 && totalElements > courses.length && (
                <span className="text-gray-500 text-sm">
                  (Showing {page * pageSize + 1}-
                  {Math.min((page + 1) * pageSize, totalElements)})
                </span>
              )}
            </>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-sm text-gray-600 font-medium"
          >
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium cursor-pointer transition-all hover:border-gray-400"
          >
            <option value="latest">Latest (Newest First)</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert">
          <p className="text-red-800">
            {(error as any)?.message || "Failed to fetch courses"}
          </p>
          <Button
            variant="secondary"
            onClick={onRefetch}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State — grid skeleton matching the real grid exactly */}
      {isLoading && <CourseGridSkeleton count={pageSize} columns={3} />}

      {/* Courses Grid */}
      {!isLoading && !error && courses.length > 0 && (
        <CourseGrid
          courses={courses}
          onCourseClick={handleCourseClick}
          columns={3}
          showActions={true}
          enrolledCourseIds={enrolledCourseIds}
          cartCourseIds={cartCourseIds}
          addingToCartIds={addingIds}
          enrollingCourseIds={enrollingIds}
          onAddToCart={handleAddToCart}
          onGoToCourse={handleGoToCourse}
          onEnrollFree={handleEnrollFree}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && courses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No courses found
            </h3>
            <p className="text-gray-600 mb-6">
              {activeFiltersCount > 0
                ? "Try adjusting your filters to see more results"
                : "Check back later for new courses"}
            </p>
            {activeFiltersCount > 0 && (
              <Button
                variant="primary"
                onClick={onClearFilters}
                className="mx-auto"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && courses.length > 0 && totalPages > 1 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 mt-12">
          <Button
            variant="secondary"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {/* First page */}
            {page > 2 && (
              <>
                <button
                  onClick={() => onPageChange(0)}
                  className="w-10 h-10 rounded-lg transition-all hover:bg-gray-100 text-gray-700 font-medium"
                  aria-label="Go to page 1"
                >
                  1
                </button>
                {page > 3 && (
                  <span className="px-2 text-gray-400">...</span>
                )}
              </>
            )}

            {/* Pages around current */}
            {Array.from({ length: totalPages }, (_, i) => {
              if (
                i === page ||
                i === page - 1 ||
                i === page + 1 ||
                (page === 0 && i === 2) ||
                (page === totalPages - 1 && i === totalPages - 3)
              ) {
                return (
                  <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-10 h-10 rounded-lg transition-all font-medium ${
                      page === i
                        ? "bg-blue-600 text-white shadow-md scale-105"
                        : "hover:bg-gray-100 text-gray-700 hover:scale-105"
                    }`}
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={page === i ? "page" : undefined}
                  >
                    {i + 1}
                  </button>
                );
              }
              return null;
            })}

            {/* Last page */}
            {page < totalPages - 3 && (
              <>
                {page < totalPages - 4 && (
                  <span className="px-2 text-gray-400">...</span>
                )}
                <button
                  onClick={() => onPageChange(totalPages - 1)}
                  className="w-10 h-10 rounded-lg transition-all hover:bg-gray-100 text-gray-700 font-medium"
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              onPageChange(Math.min(totalPages - 1, page + 1))
            }
            disabled={page === totalPages - 1}
            className="flex items-center gap-1"
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </main>
  );
};
