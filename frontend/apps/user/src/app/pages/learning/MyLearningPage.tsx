import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { enrollmentService } from "../../services/enrollment.service";
import { MyLearningSkeleton } from "../../components/route-skeletons/MyLearningSkeleton";
import type {
  EnrollmentResponse,
  EnrollmentStatsResponse,
} from "@edumind/shared-types";
import { EnrollmentStatus } from "@edumind/shared-constants";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import { useAuthStore } from "../../stores/auth.store";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_ENROLLMENTS } from "../../lib/query-config";

import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";
import {
  HeroSection,
  CourseFilters,
  CourseList,
  LearningSidebar,
  type FilterStatus,
} from "./components";

export const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [page, setPage] = useState(0);
  const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);
  const pageSize = 12;

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [filterStatus]);

  // Fetch enrollment statistics (accurate counts from backend - single query)
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } =
    useQuery<EnrollmentStatsResponse>({
      queryKey: queryKeys.enrollments.stats(userId),
      queryFn: () => enrollmentService.getMyEnrollmentStats(),
      staleTime: STALE_TIME_ENROLLMENTS,
      enabled: Boolean(userId),
    });

  // Fetch all enrollments (for 'all' filter only, with proper pagination)
  const { data: allEnrollmentsResponse, isLoading: allLoading, isError: allError, refetch: refetchAll } = useQuery({
    queryKey: queryKeys.enrollments.me(userId, page, pageSize),
    queryFn: async () => {
      return enrollmentService.getMyEnrollments({ page, size: pageSize });
    },
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId) && filterStatus === "all",
    placeholderData: (previousData) => previousData,
  });

  // Fetch active courses (for 'active' filter)
  const { data: activeEnrollmentsResponse, isLoading: activeLoading, isError: activeError, refetch: refetchActive } =
    useQuery({
      queryKey: queryKeys.enrollments.meByStatus(
        userId,
        "ACTIVE",
        page,
        pageSize,
      ),
      queryFn: () =>
        enrollmentService.getMyEnrollments({
          status: "ACTIVE",
          page,
          size: pageSize,
        }),
      staleTime: STALE_TIME_ENROLLMENTS,
      enabled: Boolean(userId) && filterStatus === "active",
      placeholderData: (previousData) => previousData,
    });

  // Fetch completed courses (for 'completed' filter)
  const { data: completedEnrollmentsResponse, isLoading: completedLoading, isError: completedError, refetch: refetchCompleted } =
    useQuery({
      queryKey: queryKeys.enrollments.meByStatus(
        userId,
        "COMPLETED",
        page,
        pageSize,
      ),
      queryFn: () =>
        enrollmentService.getMyEnrollments({
          status: "COMPLETED",
          page,
          size: pageSize,
        }),
      staleTime: STALE_TIME_ENROLLMENTS,
      enabled: Boolean(userId) && filterStatus === "completed",
      placeholderData: (previousData) => previousData,
    });

  // Determine which data to use based on filter
  const enrollments = useMemo(() => {
    switch (filterStatus) {
      case "active":
        return activeEnrollmentsResponse?.data || [];
      case "completed":
        return completedEnrollmentsResponse?.data || [];
      default:
        return allEnrollmentsResponse?.data || [];
    }
  }, [
    filterStatus,
    allEnrollmentsResponse,
    activeEnrollmentsResponse,
    completedEnrollmentsResponse,
  ]);

  const pagination = useMemo(() => {
    switch (filterStatus) {
      case "active":
        return activeEnrollmentsResponse?.pagination;
      case "completed":
        return completedEnrollmentsResponse?.pagination;
      default:
        return allEnrollmentsResponse?.pagination;
    }
  }, [
    filterStatus,
    allEnrollmentsResponse,
    activeEnrollmentsResponse,
    completedEnrollmentsResponse,
  ]);

  // Business rule:
  // - DROPPED enrollments should not appear in My Learning at all.
  // - SUSPENDED enrollments are still visible but shown as locked.
  const visibleEnrollments = useMemo(
    () =>
      (enrollments || []).filter(
        (enrollment) => enrollment.status !== EnrollmentStatus.DROPPED,
      ),
    [enrollments],
  );

  // Tab-level loading (for skeleton inside CourseList, not full-page)
  const tabLoading =
    (filterStatus === "all" && allLoading) ||
    (filterStatus === "active" && activeLoading) ||
    (filterStatus === "completed" && completedLoading);

  const tabError =
    (filterStatus === "all" && allError) ||
    (filterStatus === "active" && activeError) ||
    (filterStatus === "completed" && completedError);

  const retryCurrentQuery = () => {
    if (filterStatus === "active") return refetchActive();
    if (filterStatus === "completed") return refetchCompleted();
    return refetchAll();
  };

  // Find most recent course for "Continue Learning"
  const mostRecentCourse = useMemo(() => {
    const allData = allEnrollmentsResponse?.data || [];
    if (allData.length === 0) return null;
    return [...allData].sort(
      (a, b) =>
        new Date(b.lastAccessedAt || b.enrolledAt).getTime() -
        new Date(a.lastAccessedAt || a.enrolledAt).getTime(),
    )[0];
  }, [allEnrollmentsResponse]);

  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    if (!enrollment.courseSlug) return;
    navigate(
      buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, {
        courseSlug: enrollment.courseSlug,
      }),
    );
  };

  const handleViewCourse = (courseSlug: string) => {
    if (!courseSlug) return;
    navigate(
      buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
        courseSlug,
      }),
    );
  };

  const handleBrowseCourses = () => {
    navigate(USER_ROUTES.COURSES);
  };

  const handleStartLearning = () => {
    if (mostRecentCourse) {
      handleContinueLearning(mostRecentCourse);
    }
  };

  if (statsLoading) {
    return (
      <>
        <p className="sr-only" role="status">Loading My Learning</p>
        <MyLearningSkeleton />
      </>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center" role="alert">
          <h1 className="text-2xl font-bold text-slate-900">We couldn't load My Learning</h1>
          <p className="mt-2 text-slate-600">Check your connection and try again.</p>
          <button type="button" onClick={() => void refetchStats()} className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoMetaTags
        title="My Learning"
        description="My Learning Courses"
        noIndex={true}
      />
      <div className="min-h-screen bg-slate-50">
      {/* Hero Section with Welcome & Stats */}
      <HeroSection
        userName={user?.firstName || ""}
        stats={stats}
        mostRecentCourse={mostRecentCourse}
        onContinueLearning={handleContinueLearning}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Courses List Section */}
          <div className="flex-1">
            {/* Filters */}
            <CourseFilters
              activeFilter={filterStatus}
              onFilterChange={setFilterStatus}
              stats={stats}
            >
            {tabError ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-center" role="alert">
                <h3 className="text-lg font-semibold text-slate-900">We couldn't load these courses</h3>
                <p className="mt-2 text-slate-600">Try again to refresh this course list.</p>
                <button type="button" onClick={() => void retryCurrentQuery()} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Retry</button>
              </div>
            ) : <CourseList
              enrollments={visibleEnrollments}
              pagination={pagination}
              currentPage={page}
              filterStatus={filterStatus}
              hoveredCourse={hoveredCourse}
              isLoading={tabLoading}
              onPageChange={setPage}
              onHoverCourse={setHoveredCourse}
              onContinue={handleContinueLearning}
              onViewDetails={handleViewCourse}
              onBrowseCourses={handleBrowseCourses}
            />}
            </CourseFilters>
          </div>

          {/* Sidebar */}
          <LearningSidebar
            stats={stats}
            enrollments={visibleEnrollments}
            onStartLearning={handleStartLearning}
            onBrowseCourses={handleBrowseCourses}
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default MyLearningPage;
