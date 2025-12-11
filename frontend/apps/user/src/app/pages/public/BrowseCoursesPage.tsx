import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Loading } from "@edumind/user-ui";
import {
  CourseGrid,
  CategoryFilter,
  CourseSearchBar,
} from "../../components/course-module";
import { courseService, categoryService } from "../../services";
import type { CourseResponse, CategoryResponse } from "@edumind/shared-types";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";

type CoursesResponse = Awaited<ReturnType<typeof courseService.filterCourses>>;

export const BrowseCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    searchParams.get("category") ? Number(searchParams.get("category")) : null
  );
  const [searchKeyword, setSearchKeyword] = useState<string>(
    searchParams.get("q") || ""
  );
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(
    searchParams.get("q") || ""
  );
  const [selectedLevel, setSelectedLevel] = useState<string | null>(
    searchParams.get("level")
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get("sort") || "popular"
  );

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Debounce search to avoid spamming requests
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedKeyword(searchKeyword), 300);
    return () => clearTimeout(handle);
  }, [searchKeyword]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("category", String(selectedCategoryId));
    if (debouncedKeyword) params.set("q", debouncedKeyword);
    if (selectedLevel) params.set("level", selectedLevel);
    if (sortBy !== "popular") params.set("sort", sortBy);
    setSearchParams(params);
  }, [
    selectedCategoryId,
    debouncedKeyword,
    selectedLevel,
    sortBy,
    setSearchParams,
  ]);

  const { data: categories = [] } = useQuery<CategoryResponse[]>({
    queryKey: ["categories", "active"],
    queryFn: categoryService.getActiveCategories,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: coursesResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<CoursesResponse>({
    queryKey: [
      "courses",
      "browse",
      {
        page,
        size: pageSize,
        categoryId: selectedCategoryId,
        level: selectedLevel,
        keyword: debouncedKeyword,
        sortBy,
      },
    ],
    queryFn: async () =>
      courseService.filterCourses({
        page,
        size: pageSize,
        categoryId: selectedCategoryId || undefined,
        level: selectedLevel || undefined,
        keyword: debouncedKeyword || undefined,
        sortBy,
      }),
    placeholderData: (prev) => prev,
  });

  const courses = coursesResponse?.data || [];
  const totalPages = coursesResponse?.pagination?.totalPages || 1;

  const handleCourseClick = (course: CourseResponse) => {
    navigate(
      buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: course.id })
    );
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    setPage(0); // Reset to first page
  };

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setPage(0);
  };

  const handleLevelChange = (level: string | null) => {
    setSelectedLevel(level);
    setPage(0);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSearchKeyword("");
    setSelectedLevel(null);
    setSortBy("popular");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Browse Courses
          </h1>
          <CourseSearchBar
            onSearch={handleSearch}
            placeholder="Search for courses..."
            className="max-w-2xl"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar - Filters */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0 mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* Category Filter */}
              <CategoryFilter
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleCategoryChange}
              />

              {/* Level Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Level</h3>
                <div className="space-y-2">
                  {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((level) => (
                    <button
                      key={level}
                      onClick={() =>
                        handleLevelChange(
                          selectedLevel === level ? null : level
                        )
                      }
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedLevel === level
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {level.charAt(0) + level.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedCategoryId ||
                searchKeyword ||
                selectedLevel ||
                sortBy !== "popular") && (
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Sort & Results Count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="text-gray-600">
                {isFetching ? (
                  "Loading..."
                ) : (
                  <>
                    {courses.length > 0 && (
                      <span>
                        Showing {courses.length} of {courses.length} courses
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="popular">Most Popular</option>
                <option value="latest">Latest</option>
                <option value="featured">Featured</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">
                  {(error as any)?.message || "Failed to fetch courses"}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => refetch()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loading />
              </div>
            )}

            {/* Courses Grid */}
            {!isLoading && !error && (
              <CourseGrid
                courses={courses}
                onCourseClick={handleCourseClick}
                columns={3}
              />
            )}

            {/* Empty State */}
            {!isLoading && !error && courses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">
                  No courses found matching your criteria
                </p>
                <Button variant="primary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && courses.length > 0 && totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        page === i
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
