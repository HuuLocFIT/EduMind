import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../../lib/query-keys";
import { parseQueryParams, updateSearchParams } from "../utils/reviews.utils";
import type { FilterTab, ReviewFilters } from "../types/reviews.types";

export const useReviewFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Parse query params from URL
  const queryParams = useMemo(() => {
    return parseQueryParams(searchParams);
  }, [searchParams]);

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      updateSearchParams(searchParams, updates, setSearchParams);
    },
    [searchParams, setSearchParams]
  );

  // Get current filter values
  const currentPage = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("size") || "10", 10);
  const courseFilter = searchParams.get("courseId") || "";
  const statusFilter = (searchParams.get("status") as FilterTab) || "all";
  const ratingFilter = searchParams.get("rating") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";

  // Filter handlers
  const handleCourseFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams({ courseId: e.target.value });
    },
    [updateParams]
  );

  const handleRatingFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams({ rating: e.target.value });
    },
    [updateParams]
  );

  const handleSortByChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams({ sortBy: e.target.value });
    },
    [updateParams]
  );

  const handleSortDirToggle = useCallback(() => {
    updateParams({ sortDir: sortDir === "desc" ? "asc" : "desc" });
  }, [updateParams, sortDir]);

  const handleStatusTabClick = useCallback(
    (tabKey: FilterTab) => {
      updateParams({ status: tabKey === "all" ? undefined : tabKey });
    },
    [updateParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateParams({ page: page.toString() });
    },
    [updateParams]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.teacherReviews.all,
      exact: false,
    });
  }, [queryClient]);

  return {
    queryParams: queryParams as ReviewFilters | null,
    currentPage,
    pageSize,
    courseFilter,
    statusFilter,
    ratingFilter,
    sortBy,
    sortDir,
    updateParams,
    handleCourseFilterChange,
    handleRatingFilterChange,
    handleSortByChange,
    handleSortDirToggle,
    handleStatusTabClick,
    handlePageChange,
    handleRefresh,
  };
};

