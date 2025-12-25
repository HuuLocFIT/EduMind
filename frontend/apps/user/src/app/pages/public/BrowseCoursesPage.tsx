import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Loading, Input } from "@edumind/user-ui";
import {
  CourseGrid,
  CategoryFilter,
  CourseSearchBar,
} from "../../components/course-module";
import { courseService } from '../../services/course.service';
import { categoryService } from '../../services/category.service';
import type { CourseResponse, CategoryResponse } from "@edumind/shared-types";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import {
  Sparkles,
  Gift,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_CATEGORIES } from "../../lib/query-config";

type CoursesResponse = Awaited<ReturnType<typeof courseService.filterCourses>>;
type FilterType = "all" | "free";

export const BrowseCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter type (all, free)
  const [filterType, setFilterType] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );

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
  const [minPrice, setMinPrice] = useState<string>(
    searchParams.get("minPrice") || ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    searchParams.get("maxPrice") || ""
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get("sort") || "latest"
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
    if (filterType !== "all") params.set("filter", filterType);
    if (selectedCategoryId) params.set("category", String(selectedCategoryId));
    if (debouncedKeyword) params.set("q", debouncedKeyword);
    if (selectedLevel) params.set("level", selectedLevel);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sortBy !== "latest") params.set("sort", sortBy);
    setSearchParams(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterType,
    selectedCategoryId,
    debouncedKeyword,
    selectedLevel,
    minPrice,
    maxPrice,
    sortBy,
    // setSearchParams is stable and doesn't need to be in dependencies
  ]);

  const { data: categories = [] } = useQuery<CategoryResponse[]>({
    queryKey: queryKeys.categories.active,
    queryFn: categoryService.getActiveCategories,
    staleTime: STALE_TIME_CATEGORIES,
  });

  // Determine which API to call based on filterType
  const {
    data: coursesResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<CoursesResponse>({
    queryKey: queryKeys.courses.filtered({
      filterType,
      page,
      size: pageSize,
      categoryId: selectedCategoryId,
      level: selectedLevel,
      keyword: debouncedKeyword,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy,
    }),
    queryFn: async () => {
      const baseParams = {
        page,
        size: pageSize,
        categoryId: selectedCategoryId || undefined,
        level: selectedLevel || undefined,
        keyword: debouncedKeyword || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      };

      // Determine sort direction based on sortBy
      const sortDir: "ASC" | "DESC" =
        sortBy === "price-low"
          ? "ASC"
          : sortBy === "price-high"
          ? "DESC"
          : sortBy === "rating"
          ? "DESC"
          : "DESC";
      const sortByParam =
        sortBy === "price-low" || sortBy === "price-high"
          ? "price"
          : sortBy === "rating"
          ? "rating"
          : sortBy === "popular"
          ? "popular"
          : "latest";

      // Map filterType to sort/filter params instead of using separate endpoints
      // This allows combining filterType with other filters (category, level, keyword, etc.)
      const finalSortBy = sortByParam;
      const finalSortDir: "ASC" | "DESC" = sortDir;
      let finalMinPrice = baseParams.minPrice;
      let finalMaxPrice = baseParams.maxPrice;

      // Apply filterType as additional constraints
      switch (filterType) {
        case "free":
          // Free courses: price = 0
          finalMinPrice = 0;
          finalMaxPrice = 0;
          // Keep user's sort preference
          break;
        default:
          // "all" - use user's sort preference
          break;
      }

      // Always use filterCourses API to allow combining all filters
      return courseService.filterCourses({
        ...baseParams,
        minPrice: finalMinPrice,
        maxPrice: finalMaxPrice,
        sortBy: finalSortBy,
        sortDir: finalSortDir,
      });
    },
    placeholderData: (prev) => prev,
  });

  const courses = coursesResponse?.data || [];
  const totalPages = coursesResponse?.pagination?.totalPages || 1;
  const totalElements = coursesResponse?.pagination?.totalElements || 0;

  // Get selected category name
  const selectedCategory = useMemo(() => {
    return categories.find((cat) => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== "all") count++;
    if (selectedCategoryId) count++;
    if (selectedLevel) count++;
    if (minPrice || maxPrice) count++;
    if (searchKeyword) count++;
    return count;
  }, [
    filterType,
    selectedCategoryId,
    selectedLevel,
    minPrice,
    maxPrice,
    searchKeyword,
  ]);

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

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    setPage(0);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(0);
  };

  const clearFilters = () => {
    setFilterType("all");
    setSelectedCategoryId(null);
    setSearchKeyword("");
    setSelectedLevel(null);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("latest");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Browse Courses
            </h1>
            <p className="text-blue-100">
              Discover thousands of courses to advance your skills
            </p>
          </div>
          <div className="w-full">
            <CourseSearchBar
              onSearch={handleSearch}
              value={searchKeyword}
              placeholder="Search for courses..."
              className="w-full max-w-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => handleFilterTypeChange("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm md:text-base font-medium ${
              filterType === "all"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 hover:shadow-sm"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">All Courses</span>
            <span className="sm:hidden">All</span>
          </button>
          <button
            onClick={() => handleFilterTypeChange("free")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm md:text-base font-medium ${
              filterType === "free"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 hover:shadow-sm"
            }`}
          >
            <Gift className="w-4 h-4" />
            Free Courses
          </button>
        </div>

        {/* Active Filters Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filterType === "free" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Gift className="w-3.5 h-3.5" />
                Free Courses
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Category: {selectedCategory.name}
                <button
                  onClick={() => handleCategoryChange(null)}
                  className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLevel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Level:{" "}
                {selectedLevel.charAt(0) + selectedLevel.slice(1).toLowerCase()}
                <button
                  onClick={() => handleLevelChange(null)}
                  className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                Price: ${minPrice || "0"} - {maxPrice ? `$${maxPrice}` : "∞"}
                <button
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    setPage(0);
                  }}
                  className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchKeyword && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                Search: "{searchKeyword}"
                <button
                  onClick={() => {
                    setSearchKeyword("");
                    setPage(0);
                  }}
                  className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar - Filters */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0 mb-8 lg:mb-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 lg:sticky lg:top-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
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
                      className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                        selectedLevel === level
                          ? "bg-blue-600 text-white shadow-md"
                          : "hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {level.charAt(0) + level.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Price Range
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Min Price ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(0);
                      }}
                      placeholder="0"
                      disabled={filterType === "free"}
                      title={
                        filterType === "free"
                          ? "Price filter is set to free (0) when viewing free courses"
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Max Price ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(0);
                      }}
                      placeholder="No limit"
                      disabled={filterType === "free"}
                      title={
                        filterType === "free"
                          ? "Price filter is set to free (0) when viewing free courses"
                          : undefined
                      }
                    />
                  </div>
                </div>
                {filterType === "free" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing free courses only (price = $0)
                  </p>
                )}
              </div>

              {/* Clear Filters */}
              {(selectedCategoryId ||
                searchKeyword ||
                selectedLevel ||
                minPrice ||
                maxPrice ||
                filterType !== "all") && (
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
              <div className="flex items-center gap-2">
                {isFetching ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <>
                    {totalElements > 0 && (
                      <span className="text-gray-700 font-medium">
                        {totalElements.toLocaleString()} course
                        {totalElements !== 1 ? "s" : ""} found
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
                  onChange={(e) => handleSortChange(e.target.value)}
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
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-gray-400" />
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
                      onClick={clearFilters}
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
              <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {/* First page */}
                  {page > 2 && (
                    <>
                      <button
                        onClick={() => setPage(0)}
                        className="w-10 h-10 rounded-lg transition-all hover:bg-gray-100 text-gray-700 font-medium"
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
                          onClick={() => setPage(i)}
                          className={`w-10 h-10 rounded-lg transition-all font-medium ${
                            page === i
                              ? "bg-blue-600 text-white shadow-md scale-105"
                              : "hover:bg-gray-100 text-gray-700 hover:scale-105"
                          }`}
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
                        onClick={() => setPage(totalPages - 1)}
                        className="w-10 h-10 rounded-lg transition-all hover:bg-gray-100 text-gray-700 font-medium"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
