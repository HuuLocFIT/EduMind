import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

type CoursesResponse = Awaited<ReturnType<typeof courseService.filterCourses>>;
type FilterType = "all" | "free";
type CourseFilters = {
  filterType: FilterType;
  selectedCategoryIds: number[];
  selectedLevels: string[];
  minPrice: string;
  maxPrice: string;
  minRating?: number;
};

const EMPTY_FILTERS: CourseFilters = {
  filterType: "all",
  selectedCategoryIds: [],
  selectedLevels: [],
  minPrice: "",
  maxPrice: "",
  minRating: undefined,
};

const cloneFilters = (filters: CourseFilters): CourseFilters => ({
  ...filters,
  selectedCategoryIds: [...filters.selectedCategoryIds],
  selectedLevels: [...filters.selectedLevels],
});

const filtersEqual = (left: CourseFilters, right: CourseFilters): boolean =>
  left.filterType === right.filterType &&
  left.minPrice === right.minPrice &&
  left.maxPrice === right.maxPrice &&
  left.minRating === right.minRating &&
  left.selectedCategoryIds.join(",") === right.selectedCategoryIds.join(",") &&
  left.selectedLevels.join(",") === right.selectedLevels.join(",");

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

type AppliedUrlState = {
  filters: CourseFilters;
  keyword: string;
  sortBy: string;
};

const parseAppliedUrlState = (searchParams: URLSearchParams): AppliedUrlState => {
  const filterParam = searchParams.get("filter");
  const filterType: FilterType = filterParam === "free" ? "free" : "all";
  const categories = searchParams.get("categories");
  const levels = searchParams.get("levels");
  const rating = searchParams.get("minRating");

  return {
    filters: {
      filterType,
      selectedCategoryIds: categories
        ? categories.split(",").map(Number).filter(Boolean)
        : [],
      selectedLevels: levels ? normalizeSelectedLevels(levels.split(",")) : [],
      minPrice: filterType === "free" ? "" : searchParams.get("minPrice") || "",
      maxPrice: filterType === "free" ? "" : searchParams.get("maxPrice") || "",
      minRating: rating ? Number(rating) : undefined,
    },
    keyword: searchParams.get("q") || "",
    sortBy: searchParams.get("sort") || "latest",
  };
};

const serializeAppliedUrlState = ({
  filters,
  keyword,
  sortBy,
}: AppliedUrlState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.filterType !== "all") params.set("filter", filters.filterType);
  if (filters.selectedCategoryIds.length > 0) {
    params.set("categories", filters.selectedCategoryIds.join(","));
  }
  if (keyword) params.set("q", keyword);
  if (filters.selectedLevels.length > 0) {
    params.set("levels", filters.selectedLevels.join(","));
  }
  if (filters.filterType !== "free") {
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  }
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (sortBy !== "latest") params.set("sort", sortBy);
  return params;
};

export const BrowseCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const { success: showSuccess, error: showError } = useToast();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [initialUrlState] = useState(() => parseAppliedUrlState(searchParams));
  const [appliedFilters, setAppliedFilters] = useState<CourseFilters>(() =>
    cloneFilters(initialUrlState.filters)
  );
  const [searchInputValue, setSearchInputValue] = useState(initialUrlState.keyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialUrlState.keyword);
  const [sortBy, setSortBy] = useState<string>(initialUrlState.sortBy);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileDraftFilters, setMobileDraftFilters] = useState<CourseFilters>(() =>
    cloneFilters(appliedFilters)
  );
  const [resultsFocusRequest, setResultsFocusRequest] = useState(0);
  const [appliedRequest, setAppliedRequest] = useState(0);
  const [resultsAnnouncement, setResultsAnnouncement] = useState("");
  const pendingResultsFocusRef = useRef(false);
  const lastAnnouncedRequestRef = useRef(-1);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInternalUrlRef = useRef<string | null>(null);
  const hydratingFromUrlRef = useRef(false);

  const markAppliedRequest = (focusResults = false) => {
    if (announcementTimerRef.current) {
      clearTimeout(announcementTimerRef.current);
      announcementTimerRef.current = null;
    }
    pendingResultsFocusRef.current ||= focusResults;
    setResultsAnnouncement("");
    setAppliedRequest((request) => request + 1);
  };

  useEffect(() => () => {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
  }, []);

  // Hydrate applied state for browser Back/Forward and same-route navigations.
  // URL updates initiated by the controls are already represented in local state.
  useEffect(() => {
    const currentUrl = searchParams.toString();
    if (pendingInternalUrlRef.current === currentUrl) {
      pendingInternalUrlRef.current = null;
      return;
    }

    const next = parseAppliedUrlState(searchParams);
    const appliedStateChanged =
      !filtersEqual(appliedFilters, next.filters) ||
      appliedKeyword !== next.keyword ||
      sortBy !== next.sortBy;

    if (appliedStateChanged) {
      hydratingFromUrlRef.current = true;
      setAppliedFilters(cloneFilters(next.filters));
      setAppliedKeyword(next.keyword);
      setSortBy(next.sortBy);
    }
    setSearchInputValue(next.keyword);
    setPage(0);
    markAppliedRequest();
    // Keep an open mobile draft untouched. openMobileDrawer copies the latest
    // applied state the next time the drawer is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync control-driven applied state changes to the URL.
  useEffect(() => {
    const params = serializeAppliedUrlState({
      filters: appliedFilters,
      keyword: appliedKeyword,
      sortBy,
    });
    const nextUrl = params.toString();
    const currentAppliedUrl = serializeAppliedUrlState(
      parseAppliedUrlState(searchParams)
    ).toString();

    if (hydratingFromUrlRef.current) {
      if (nextUrl === currentAppliedUrl) hydratingFromUrlRef.current = false;
      return;
    }
    if (nextUrl === currentAppliedUrl) return;

    pendingInternalUrlRef.current = nextUrl;
    setSearchParams(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedFilters,
    appliedKeyword,
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
      filterType: appliedFilters.filterType,
      page,
      size: pageSize,
      categoryIds: appliedFilters.selectedCategoryIds,
      levels: appliedFilters.selectedLevels,
      keyword: appliedKeyword,
      minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
      maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
      minRating: appliedFilters.minRating,
      sortBy,
    }),
    queryFn: async () => {
      const baseParams = {
        page,
        size: pageSize,
        categoryIds: appliedFilters.selectedCategoryIds.length > 0 ? appliedFilters.selectedCategoryIds : undefined,
        levels: appliedFilters.selectedLevels.length > 0 ? appliedFilters.selectedLevels : undefined,
        keyword: appliedKeyword || undefined,
        minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
        maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
        minRating: appliedFilters.minRating,
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
      switch (appliedFilters.filterType) {
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

  useEffect(() => {
    if (
      isFetching ||
      error ||
      isMobileDrawerOpen ||
      !coursesResponse ||
      lastAnnouncedRequestRef.current === appliedRequest
    ) return;

    const announcement = totalElements === 0
      ? "0 courses found"
      : totalPages > 1
      ? `Showing courses ${(page * pageSize + 1).toLocaleString()} through ${Math.min(
          (page + 1) * pageSize,
          totalElements
        ).toLocaleString()} of ${totalElements.toLocaleString()} course${
          totalElements === 1 ? "" : "s"
        } found`
      : `${totalElements.toLocaleString()} course${totalElements === 1 ? "" : "s"} found`;

    lastAnnouncedRequestRef.current = appliedRequest;
    if (pendingResultsFocusRef.current) {
      pendingResultsFocusRef.current = false;
      setResultsFocusRequest((request) => request + 1);
      return;
    }

    // VoiceOver commonly prioritizes focus/activation events and drops a
    // live-region update committed in the same render. This is especially
    // common when a clear/remove control disappears after activation.
    // Publish the status separately after the control DOM has settled.
    announcementTimerRef.current = setTimeout(() => {
      setResultsAnnouncement(announcement);
      announcementTimerRef.current = null;
    }, 300);
  }, [appliedRequest, coursesResponse, error, isFetching, isMobileDrawerOpen, page, totalElements, totalPages]);

  // Get selected categories
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => appliedFilters.selectedCategoryIds.includes(cat.id));
  }, [appliedFilters.selectedCategoryIds, categories]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.filterType !== "all") count++;
    if (appliedFilters.selectedCategoryIds.length > 0) count++;
    if (appliedFilters.selectedLevels.length > 0) count++;
    if (appliedFilters.minPrice || appliedFilters.maxPrice) count++;
    if (appliedFilters.minRating) count++;
    if (appliedKeyword) count++;
    return count;
  }, [appliedFilters, appliedKeyword]);

  const handleCourseClick = (course: CourseResponse) => {
    navigate(
      buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseSlug: course.slug })
    );
  };

  const handleSearchSubmit = () => {
    const keyword = searchInputValue.trim();
    const shouldRefetchCurrentQuery = keyword === appliedKeyword;
    setSearchInputValue(keyword);
    setAppliedKeyword(keyword);
    setPage(0);
    markAppliedRequest();
    if (shouldRefetchCurrentQuery) void refetch();
  };

  const handleClearSearch = () => {
    const shouldRefetchCurrentQuery = appliedKeyword === "";
    setSearchInputValue("");
    setAppliedKeyword("");
    setPage(0);
    markAppliedRequest(true);
    if (shouldRefetchCurrentQuery) void refetch();
  };

  const handleCategoryChange = (categoryId: number, focusResults = false) => {
    setAppliedFilters((prev) => ({
      ...prev,
      selectedCategoryIds: prev.selectedCategoryIds.includes(categoryId)
        ? prev.selectedCategoryIds.filter((id) => id !== categoryId)
        : [...prev.selectedCategoryIds, categoryId],
    }));
    setPage(0);
    markAppliedRequest(focusResults);
  };

  const handleLevelChange = (level: string, focusResults = false) => {
    setAppliedFilters((prev) => ({
      ...prev,
      selectedLevels: normalizeSelectedLevels(
        prev.selectedLevels.includes(level)
          ? prev.selectedLevels.filter((item) => item !== level)
          : [...prev.selectedLevels, level]
      ),
    }));
    setPage(0);
    markAppliedRequest(focusResults);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(0);
    markAppliedRequest();
  };

  const handleFilterTypeChange = (type: FilterType, focusResults = false) => {
    setAppliedFilters((prev) => ({
      ...prev,
      filterType: type,
      minPrice: type === "free" ? "" : prev.minPrice,
      maxPrice: type === "free" ? "" : prev.maxPrice,
    }));
    setPage(0);
    markAppliedRequest(focusResults);
  };

  const clearFilters = () => {
    setAppliedFilters(cloneFilters(EMPTY_FILTERS));
    setSearchInputValue("");
    setAppliedKeyword("");
    setSortBy("latest");
    setPage(0);
    markAppliedRequest(true);
  };

  const openMobileDrawer = () => {
    // Ignore any background result completion while the modal is active.
    if (announcementTimerRef.current) {
      clearTimeout(announcementTimerRef.current);
      announcementTimerRef.current = null;
    }
    setResultsAnnouncement("");
    lastAnnouncedRequestRef.current = appliedRequest;
    pendingResultsFocusRef.current = false;
    setMobileDraftFilters(cloneFilters(appliedFilters));
    setIsMobileDrawerOpen(true);
  };

  const handleCloseMobileDrawer = () => {
    setIsMobileDrawerOpen(false);
    setTimeout(() => filterButtonRef.current?.focus(), 0);
  };

  const handleApplyMobileFilters = () => {
    const shouldRefetchCurrentQuery = filtersEqual(appliedFilters, mobileDraftFilters) && page === 0;
    setAppliedFilters(cloneFilters(mobileDraftFilters));
    setPage(0);
    setIsMobileDrawerOpen(false);
    markAppliedRequest(true);
    if (shouldRefetchCurrentQuery) void refetch();
  };

  const updateAppliedFilter = <K extends keyof CourseFilters,>(
    key: K,
    value: CourseFilters[K],
    focusResults = false
  ) => {
    setAppliedFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
    markAppliedRequest(focusResults);
  };

  const updateDraftFilter = <K extends keyof CourseFilters,>(key: K, value: CourseFilters[K]) => {
    setMobileDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearPrice = (focusResults = false) => {
    setAppliedFilters((prev) => ({ ...prev, minPrice: "", maxPrice: "" }));
    setPage(0);
    markAppliedRequest(focusResults);
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

  const handleGoToCourse = (courseSlug: string) => {
    navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseSlug }));
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

  const pageTitle = appliedKeyword
    ? `${appliedKeyword} Courses`
    : appliedFilters.filterType === 'free' ? 'Free Courses' : 'Browse Courses';

  const pageDescription = appliedKeyword
    ? `Browse ${appliedKeyword} courses on EduMind. Find the perfect course for your learning journey.`
    : appliedFilters.filterType === 'free'
    ? 'Explore free courses on EduMind. Start learning without any cost.'
    : 'Browse our wide selection of courses on EduMind. Find expert-led courses to advance your skills.';

  return (
    <>
      <SeoMetaTags
        title={pageTitle}
        description={pageDescription}
        canonicalUrl="/courses"
        noIndex={activeFiltersCount > 0}
      />
      <div className="min-h-screen bg-gray-50" aria-hidden={isMobileDrawerOpen || undefined}>
      <BrowseHeroSection
        value={searchInputValue}
        onInputChange={setSearchInputValue}
        onSubmit={handleSearchSubmit}
        onClear={handleClearSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <BrowseActiveFilters
          activeFiltersCount={activeFiltersCount}
          filterType={appliedFilters.filterType}
          onFilterTypeChange={(type) => handleFilterTypeChange(type, true)}
          selectedCategories={selectedCategories}
          onCategoryChange={(id) => handleCategoryChange(id, true)}
          selectedLevels={appliedFilters.selectedLevels}
          onLevelChange={(level) => handleLevelChange(level, true)}
          minPrice={appliedFilters.minPrice}
          maxPrice={appliedFilters.maxPrice}
          onClearPrice={() => handleClearPrice(true)}
          minRating={appliedFilters.minRating}
          onClearRating={() => updateAppliedFilter("minRating", undefined, true)}
          appliedKeyword={appliedKeyword}
          onClearSearch={handleClearSearch}
        />

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            ref={filterButtonRef}
            onClick={openMobileDrawer}
            aria-expanded={isMobileDrawerOpen}
            aria-controls="mobile-filter-drawer"
            aria-haspopup="dialog"
            aria-label={`Filters${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : " (0 active)"}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
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
              selectedCategoryIds={appliedFilters.selectedCategoryIds}
              onCategoryChange={handleCategoryChange}
              selectedLevels={appliedFilters.selectedLevels}
              onLevelChange={handleLevelChange}
              minPrice={appliedFilters.minPrice}
              maxPrice={appliedFilters.maxPrice}
              setMinPrice={(value) => updateAppliedFilter("minPrice", value)}
              setMaxPrice={(value) => updateAppliedFilter("maxPrice", value)}
              minRating={appliedFilters.minRating}
              setMinRating={(value) => updateAppliedFilter("minRating", value)}
               filterType={appliedFilters.filterType}
               onFilterTypeChange={handleFilterTypeChange}
               onClearFilters={clearFilters}
               showClearButton={activeFiltersCount > 0}
            />
          </div>

          {/* Mobile Drawer */}
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
            onPageChange={(nextPage) => {
              setPage(nextPage);
              markAppliedRequest(true);
            }}
            
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
            focusRequest={resultsFocusRequest}
            resultsAnnouncement={resultsAnnouncement}
          />
        </div>
      </div>
      </div>
      <MobileFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={handleCloseMobileDrawer}
        onApply={handleApplyMobileFilters}
        categories={categories}
        selectedCategoryIds={mobileDraftFilters.selectedCategoryIds}
        onCategoryChange={(categoryId) => setMobileDraftFilters((prev) => ({
          ...prev,
          selectedCategoryIds: prev.selectedCategoryIds.includes(categoryId)
            ? prev.selectedCategoryIds.filter((id) => id !== categoryId)
            : [...prev.selectedCategoryIds, categoryId],
        }))}
        selectedLevels={mobileDraftFilters.selectedLevels}
        onLevelChange={(level) => setMobileDraftFilters((prev) => ({
          ...prev,
          selectedLevels: normalizeSelectedLevels(
            prev.selectedLevels.includes(level)
              ? prev.selectedLevels.filter((item) => item !== level)
              : [...prev.selectedLevels, level]
          ),
        }))}
        minPrice={mobileDraftFilters.minPrice}
        maxPrice={mobileDraftFilters.maxPrice}
        setMinPrice={(value) => updateDraftFilter("minPrice", value)}
        setMaxPrice={(value) => updateDraftFilter("maxPrice", value)}
        minRating={mobileDraftFilters.minRating}
        setMinRating={(value) => updateDraftFilter("minRating", value)}
        filterType={mobileDraftFilters.filterType}
        onFilterTypeChange={(filterType) => setMobileDraftFilters((prev) => ({
          ...prev,
          filterType,
          minPrice: filterType === "free" ? "" : prev.minPrice,
          maxPrice: filterType === "free" ? "" : prev.maxPrice,
        }))}
        onClearFilters={() => setMobileDraftFilters(cloneFilters(EMPTY_FILTERS))}
        showClearButton={Boolean(
          mobileDraftFilters.filterType !== "all" ||
          mobileDraftFilters.selectedCategoryIds.length ||
          mobileDraftFilters.selectedLevels.length ||
          mobileDraftFilters.minPrice ||
          mobileDraftFilters.maxPrice ||
          mobileDraftFilters.minRating
        )}
      />
    </>
  );
};

export default BrowseCoursesPage;
