import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Loading } from "@edumind/user-ui";
import {
  CourseGrid,
  CategoryFilter,
  CourseSearchBar,
} from "../components/course-module";
import { courseService, categoryService } from "../services";
import type {
  CourseResponse,
  CategoryResponse,
} from "@edumind/shared-types";

export const BrowseCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null
  );
  const [searchKeyword, setSearchKeyword] = useState<string>(
    searchParams.get('q') || ''
  );
  const [selectedLevel, setSelectedLevel] = useState<string | null>(
    searchParams.get('level')
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get('sort') || 'popular'
  );

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 12;

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch courses when filters change
  useEffect(() => {
    fetchCourses();
    // Update URL params
    const params: any = {};
    if (selectedCategoryId) params.category = selectedCategoryId;
    if (searchKeyword) params.q = searchKeyword;
    if (selectedLevel) params.level = selectedLevel;
    if (sortBy !== "popular") params.sort = sortBy;
    setSearchParams(params);
  }, [selectedCategoryId, searchKeyword, selectedLevel, sortBy, page]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getActiveCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await courseService.filterCourses({
        page,
        size: pageSize,
        categoryId: selectedCategoryId || undefined,
        level: selectedLevel || undefined,
        keyword: searchKeyword || undefined,
        sortBy,
      });

      setCourses(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch courses');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: CourseResponse) => {
    navigate(`/courses/${course.id}`);
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
    setSearchKeyword('');
    setSelectedLevel(null);
    setSortBy('popular');
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
                  {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleLevelChange(selectedLevel === level ? null : level)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {level.charAt(0) + level.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedCategoryId || searchKeyword || selectedLevel || sortBy !== 'popular') && (
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
                {loading ? (
                  'Loading...'
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
                <p className="text-red-800">{error}</p>
                <Button
                  variant="secondary"
                  onClick={fetchCourses}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loading />
              </div>
            )}

            {/* Courses Grid */}
            {!loading && !error && (
              <CourseGrid
                courses={courses}
                onCourseClick={handleCourseClick}
                columns={3}
              />
            )}

            {/* Empty State */}
            {!loading && !error && courses.length === 0 && (
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
            {!loading && courses.length > 0 && totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
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
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
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