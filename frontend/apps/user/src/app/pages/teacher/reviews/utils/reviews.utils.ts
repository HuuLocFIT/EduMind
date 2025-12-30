import type { FilterTab, ReviewFilters } from "../types/reviews.types";

/**
 * Parse and validate query parameters from URL search params
 */
export const parseQueryParams = (
  searchParams: URLSearchParams
): Partial<ReviewFilters> | null => {
  const page = parseInt(searchParams.get("page") || "0", 10);
  const size = parseInt(searchParams.get("size") || "10", 10);
  const courseFilter = searchParams.get("courseId") || "";
  const ratingFilter = searchParams.get("rating") || "";
  const sortBy = (searchParams.get("sortBy") || "createdAt") as ReviewFilters["sortBy"];
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const statusFilter = (searchParams.get("status") as FilterTab) || "all";

  let courseId: number | undefined;
  let rating: number | undefined;

  // Parse and validate courseId
  if (courseFilter) {
    const parsed = parseInt(courseFilter, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return null; // Invalid courseId
    }
    courseId = parsed;
  }

  // Parse and validate rating
  if (ratingFilter) {
    const parsed = parseInt(ratingFilter, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
      return null; // Invalid rating
    }
    rating = parsed;
  }

  // Compute hasReply from status filter
  const hasReply =
    statusFilter === "replied"
      ? true
      : statusFilter === "unreplied"
      ? false
      : undefined;

  return {
    page,
    size,
    courseId,
    rating,
    hasReply,
    sortBy,
    sortDir,
  };
};

/**
 * Update URL search params with new values
 */
export const updateSearchParams = (
  currentParams: URLSearchParams,
  updates: Record<string, string | undefined>,
  setSearchParams: (params: URLSearchParams) => void
): void => {
  const newParams = new URLSearchParams(currentParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
  });

  // Reset page when filters change (but not when page itself changes)
  if (!("page" in updates)) {
    newParams.set("page", "0");
  }

  setSearchParams(newParams);
};

