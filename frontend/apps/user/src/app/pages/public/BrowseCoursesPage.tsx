import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@edumind/user-ui";
import { Sparkles, Gift } from "lucide-react";
import {
  BrowseHeroSection,
  BrowseFilterSidebar,
  BrowseActiveFilters,
  BrowseCourseList,
} from "./components";
import { courseService } from '../../services/course.service';
import { categoryService } from '../../services/category.service';
import { enrollmentService } from '../../services/enrollment.service';
import { checkoutService } from '../../services/checkout.service';
import type { CourseResponse, CategoryResponse, DirectCheckoutRequest } from "@edumind/shared-types";
import { PaymentMethod } from "@edumind/shared-constants";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_CATEGORIES } from "../../lib/query-config";
import { useCart, useAddToCart } from "../../hooks/useCart";
import { useAuthStore } from "../../stores/auth.store";
import { useCartStore } from "../../stores/cart.store";

type CoursesResponse = Awaited<ReturnType<typeof courseService.filterCourses>>;
type FilterType = "all" | "free";

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
        {/* Quick Filter Buttons & Active Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
           {/* These buttons could also be in a component, but keeping here for now as they toggle main filterType */}
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

        <BrowseActiveFilters
          activeFiltersCount={activeFiltersCount}
          filterType={filterType}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
          minPrice={minPrice}
          maxPrice={maxPrice}
          setMinPrice={setMinPrice}
          setMaxPrice={setMaxPrice}
          setPage={setPage}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
        />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <BrowseFilterSidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={handleCategoryChange}
            selectedLevel={selectedLevel}
            onLevelChange={handleLevelChange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            setMinPrice={setMinPrice}
            setMaxPrice={setMaxPrice}
            filterType={filterType}
            setPage={setPage}
            onClearFilters={clearFilters}
            showClearButton={Boolean(selectedCategoryId || searchKeyword || selectedLevel || minPrice || maxPrice || filterType !== "all")}
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
