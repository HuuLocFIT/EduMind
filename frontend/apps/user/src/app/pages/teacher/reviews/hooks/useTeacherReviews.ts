import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useRef } from "react";
import { useToast } from "@edumind/user-ui";
import { teacherCourseService } from "../../../../services/teacher-course.service";
import { queryKeys } from "../../../../lib/query-keys";
import { STALE_TIME_TEACHER_REVIEWS } from "../../../../lib/query-config";
import type { ReviewFilters } from "../types/reviews.types";

export const useTeacherReviews = (queryParams: ReviewFilters | null) => {
  const { error: showError } = useToast();

  // Fetch reviews
  const {
    data: reviewsResponse,
    isLoading: loading,
    error: reviewsError,
  } = useQuery({
    queryKey: queryKeys.teacherReviews.list(queryParams || {}),
    queryFn: async () => {
      if (!queryParams) {
        throw new Error("Invalid filter parameters");
      }
      return teacherCourseService.getInstructorReviews(queryParams);
    },
    staleTime: STALE_TIME_TEACHER_REVIEWS,
    placeholderData: (previousData) => previousData,
    enabled: queryParams !== null,
  });

  const reviews = reviewsResponse?.data || [];
  const totalElements = reviewsResponse?.pagination?.totalElements || 0;
  const totalPages = reviewsResponse?.pagination?.totalPages || 0;

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: queryKeys.teacherReviews.stats,
    queryFn: async () => {
      return teacherCourseService.getInstructorReviewsStats();
    },
    staleTime: STALE_TIME_TEACHER_REVIEWS,
  });

  // Fetch courses for filter
  const {
    data: courses = [],
  } = useQuery({
    queryKey: queryKeys.teacherReviews.courses,
    queryFn: async () => {
      return teacherCourseService.getCoursesWithReviews();
    },
    staleTime: STALE_TIME_TEACHER_REVIEWS,
  });

  // Handle reviews error (using ref to prevent duplicate toasts)
  const errorShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (reviewsError && errorShownRef.current !== reviewsError.message) {
      errorShownRef.current = reviewsError.message || "unknown";
      showError("Failed to load reviews");
    }
  }, [reviewsError, showError]);

  return {
    reviews,
    totalElements,
    totalPages,
    loading,
    stats,
    statsLoading,
    courses,
  };
};

