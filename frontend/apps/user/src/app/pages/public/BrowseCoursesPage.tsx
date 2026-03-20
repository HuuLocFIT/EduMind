import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@edumind/user-ui";
import { Filter } from "lucide-react";
import {
  BrowseHeroSection,
  BrowseFilterSidebar,
  BrowseActiveFilters,
  BrowseCourseList,
} from "./components";
import { MobileFilterDrawer } from "./components/MobileFilterDrawer";
import { courseService } from '../../services/course.service';
import { categoryService } from '../../services/category.service';
import { enrollmentService } from '../../services/enrollment.service';
import { checkoutService } from '../../services/checkout.service';
import type { CourseResponse, CategoryResponse, DirectCheckoutRequest } from "@edumind/shared-types";
import { CourseLevel, PaymentMethod } from "@edumind/shared-constants";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_CATEGORIES } from "../../lib/query-config";
import { useCart, useAddToCart } from "../../hooks/useCart";
import { useAuthStore } from "../../stores/auth.store";
import { useCartStore } from "../../stores/cart.store";

type CoursesResponse = Awaited<ReturnType<typeof courseService.filterCourses>>;
type FilterType = "all" | "free";

const SPECIFIC_COURSE_LEVELS = [
  CourseLevel.BEGINNER,
  CourseLevel.INTERMEDIATE,
  CourseLevel.ADVANCED,
] as const;

const normalizeSelectedLevels = (levels: string[]): string[] => {
  const unique = Array.from(new Set(levels.filter(Boolean)));
  const hasAllSpecificLevels = SPECIFIC_COURSE_LEVELS.every((level) =>
    unique.includes(level)
  );

  // Selecting all specific levels is equivalent to no level filter.
  return hasAllSpecificLevels ? [] : unique;
};

export const BrowseCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Filter type (all, free)
  const [filterType, setFilterType] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );

  // Filters - using arrays for multi-select
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
    const categories = searchParams.get("categories");
    return categories ? categories.split(",").map(Number).filter(Boolean) : [];
  });
  const [searchKeyword, setSearchKeyword] = useState<string>(
    searchParams.get("q") || ""
  );
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(
    searchParams.get("q") || ""
  );
  const [selectedLevels, setSelectedLevels] = useState<string[]>(() => {
    const levels = searchParams.get("levels");
    return levels ? normalizeSelectedLevels(levels.split(",")) : [];
  });
  const [minPrice, setMinPrice] = useState<string>(
    searchParams.get("minPrice") || ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    searchParams.get("maxPrice") || ""
  );
  const [minRating, setMinRating] = useState<number | undefined>(() => {
    const rating = searchParams.get("minRating");
    return rating ? Number(rating) : undefined;
  });
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get("sort") || "latest"
  );

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Debounce search to avoid spamming requests
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedKeyword(searchKeyword), 300);
    return () => clearTimeout(handle);
  }, [searchKeyword]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("filter", filterType);
    if (selectedCategoryIds.length > 0) params.set("categories", selectedCategoryIds.join(","));
    if (debouncedKeyword) params.set("q", debouncedKeyword);
    if (selectedLevels.length > 0) params.set("levels", selectedLevels.join(","));
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minRating) params.set("minRating", String(minRating));
    if (sortBy !== "latest") params.set("sort", sortBy);
    setSearchParams(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterType,
    selectedCategoryIds,
    debouncedKeyword,
    selectedLevels,
    minPrice,
    maxPrice,
    minRating,
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
      categoryIds: selectedCategoryIds,
      levels: selectedLevels,
      keyword: debouncedKeyword,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating,
      sortBy,
    }),
    queryFn: async () => {
      const baseParams = {
        page,
        size: pageSize,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        levels: selectedLevels.length > 0 ? selectedLevels : undefined,
        keyword: debouncedKeyword || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minRating,
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

  // Get selected categories
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== "all") count++;
    if (selectedCategoryIds.length > 0) count++;
    if (selectedLevels.length > 0) count++;
    if (minPrice || maxPrice) count++;
    if (minRating) count++;
    if (searchKeyword) count++;
    return count;
  }, [
    filterType,
    selectedCategoryIds,
    selectedLevels,
    minPrice,
    maxPrice,
    minRating,
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

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
    setPage(0);
  };

  const handleLevelChange = (level: string) => {
    setSelectedLevels((prev) => {
      const next = prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level];

      return normalizeSelectedLevels(next);
    });
    setPage(0);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(0);
  };

  const clearFilters = () => {
    setFilterType("all");
    setSelectedCategoryIds([]);
    setSearchKeyword("");
    setSelectedLevels([]);
    setMinPrice("");
    setMaxPrice("");
    setMinRating(undefined);
    setSortBy("latest");
    setPage(0);
  };

  // Cart and enrollment state for action buttons
  const { data: cart } = useCart();
  const addToCartMutation = useAddToCart();
  const { startAddingItem, finishAddingItem } = useCartStore();
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [enrollingIds, setEnrollingIds] = useState<Set<number>>(new Set());

  // Fetch user enrollments for showing "Enrolled" status
  const { data: enrollmentsData } = useQuery({
    queryKey: queryKeys.enrollments.me(),
    queryFn: () => enrollmentService.getMyEnrollments({ page: 0, size: 100 }),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Build sets for quick lookup
  const enrolledCourseIds = useMemo(() => {
    if (!enrollmentsData?.data) return new Set<number>();
    return new Set(enrollmentsData.data.map(e => e.courseId));
  }, [enrollmentsData]);

  const cartCourseIds = useMemo(() => {
    if (!cart?.items) return new Set<number>();
    return new Set(cart.items.map(item => item.courseId));
  }, [cart]);

  const handleAddToCart = async (courseId: number) => {
    if (!isAuthenticated) {
      showError("Please login to add courses to cart");
      navigate(USER_ROUTES.LOGIN);
      return;
    }

    try {
      setAddingIds(prev => new Set(prev).add(courseId));
      startAddingItem(courseId);
      await addToCartMutation.mutateAsync(courseId);
      showSuccess("Course added to cart!");
    } catch (error: any) {
      showError(error?.message || "Failed to add to cart");
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
      finishAddingItem(courseId);
    }
  };

  const handleGoToCourse = (courseId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseId }));
  };

  // Direct checkout for free courses
  const directCheckoutMutation = useMutation({
    mutationFn: (request: DirectCheckoutRequest) => checkoutService.directCheckout(request),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Refresh enrollments immediately
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
        showSuccess("Enrolled successfully!");
        // Optional: Navigate to course or learning page logic here
      } else {
        showError(result.message || "Enrollment failed");
      }
    },
    onError: (err: any) => {
      showError(err.message || "Failed to enroll");
    },
    onSettled: (data, error, variables) => {
       setEnrollingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.courseId);
        return next;
       });
    }
  });

  const handleEnrollFree = (courseId: number) => {
    if (!isAuthenticated) {
      showError("Please login to enroll");
      navigate(USER_ROUTES.LOGIN);
      return;
    }

    setEnrollingIds(prev => new Set(prev).add(courseId));

    directCheckoutMutation.mutate({
      courseId,
      paymentMethod: PaymentMethod.FREE,
      successUrl: window.location.href, // Stay on page or redirect?
      cancelUrl: window.location.href,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BrowseHeroSection
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        onSearch={handleSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <BrowseActiveFilters
          activeFiltersCount={activeFiltersCount}
          filterType={filterType}
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
          selectedLevels={selectedLevels}
          onLevelChange={handleLevelChange}
          minPrice={minPrice}
          maxPrice={maxPrice}
          setMinPrice={setMinPrice}
          setMaxPrice={setMaxPrice}
          setPage={setPage}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block">
            <BrowseFilterSidebar
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onCategoryChange={handleCategoryChange}
              selectedLevels={selectedLevels}
              onLevelChange={handleLevelChange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              minRating={minRating}
              setMinRating={setMinRating}
              filterType={filterType}
              setPage={setPage}
              onClearFilters={clearFilters}
              showClearButton={Boolean(selectedCategoryIds.length > 0 || searchKeyword || selectedLevels.length > 0 || minPrice || maxPrice || minRating || filterType !== "all")}
            />
          </div>

          {/* Mobile Drawer */}
          <MobileFilterDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            onApply={() => {
              setIsMobileDrawerOpen(false);
              setPage(0);
            }}
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onCategoryChange={handleCategoryChange}
            selectedLevels={selectedLevels}
            onLevelChange={handleLevelChange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            setMinPrice={setMinPrice}
            setMaxPrice={setMaxPrice}
            minRating={minRating}
            setMinRating={setMinRating}
            filterType={filterType}
            setPage={setPage}
            onClearFilters={clearFilters}
            showClearButton={Boolean(selectedCategoryIds.length > 0 || searchKeyword || selectedLevels.length > 0 || minPrice || maxPrice || minRating || filterType !== "all")}
          />

          <BrowseCourseList
            isFetching={isFetching}
            isLoading={isLoading}
            error={error}
            courses={courses}
            totalElements={totalElements}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            onRefetch={() => refetch()}
            onPageChange={setPage}
            
            handleCourseClick={handleCourseClick}
            enrolledCourseIds={enrolledCourseIds}
            cartCourseIds={cartCourseIds}
            addingIds={addingIds}
            enrollingIds={enrollingIds}
            handleAddToCart={handleAddToCart}
            handleGoToCourse={handleGoToCourse}
            handleEnrollFree={handleEnrollFree}

            activeFiltersCount={activeFiltersCount}
            onClearFilters={clearFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default BrowseCoursesPage;
