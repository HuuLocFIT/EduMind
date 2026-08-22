import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { enrollmentService } from "../services/enrollment.service";
import { courseService } from "../services/course.service";
import { wishlistService } from "../services/wishlist.service";
import { CourseGrid, CourseGridSkeleton } from "../components/course-module";
import type {
  EnrollmentResponse,
  EnrollmentStatsResponse,
  CourseResponse,
  CategoryResponse,
} from "@edumind/shared-types";
import { queryKeys } from "../lib/query-keys";
import {
  STALE_TIME_ENROLLMENTS,
  STALE_TIME_COURSES_PUBLIC,
  STALE_TIME_WISHLIST,
} from "../lib/query-config";
import { AlertCircle, ChevronRight, RefreshCw, TrendingUp } from "lucide-react";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import TeacherApplicationBanner from "../components/TeacherApplicationBanner";

// Import split components
import {
  DashboardHeroSection,
  ContinueLearningSection,
  DashboardSidebar,
  NewestCoursesSection,
} from "./dashboard/components";
import { categoryService } from "../services/category.service";
import { SeoMetaTags } from "../components/Seo/SeoMetaTags";
import { useTeacherApplication } from "../hooks/useTeacherApplication";
import { UserRole } from "@edumind/shared-constants";
import { useDashboardReadySignal } from "./dashboard/DashboardBoot";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;
  const signalReady = useDashboardReadySignal();
  const didSignalReady = useRef(false);
  const isTeacher = Boolean(
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL),
  );
  const needsTeacherApplication = Boolean(
    user?.roles.includes(UserRole.STUDENT) && !isTeacher,
  );
  // Data fetching
  const {
    data: recentEnrollments = [],
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useQuery<EnrollmentResponse[]>({
    queryKey: queryKeys.enrollments.recent(userId, 3),
    queryFn: () => enrollmentService.getRecentlyAccessedCourses(3),
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId),
  });

  const {
    data: statsData,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery<EnrollmentStatsResponse>({
    queryKey: queryKeys.enrollments.stats(userId),
    queryFn: () => enrollmentService.getMyEnrollmentStats(),
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId),
  });

  const {
    data: popularCourses = [],
    isLoading: popularLoading,
    isError: popularError,
    refetch: refetchPopular,
  } = useQuery<CourseResponse[]>({
    queryKey: queryKeys.courses.popular(0, 4),
    queryFn: async () => {
      const response = await courseService.getMostPopularCourses({
        page: 0,
        size: 4,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_COURSES_PUBLIC,
  });

  const {
    data: newestCourses = [],
    isLoading: newestLoading,
    isError: newestError,
    refetch: refetchNewest,
  } = useQuery<CourseResponse[]>({
    queryKey: queryKeys.courses.newest(0, 4),
    queryFn: async () => {
      const response = await courseService.getNewestCourses({
        page: 0,
        size: 4,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_COURSES_PUBLIC,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<CategoryResponse[]>({
    queryKey: queryKeys.categories.active,
    queryFn: categoryService.getActiveCategories,
    staleTime: Infinity, // Categories change rarely
  });

  const { isLoading: applicationLoading } = useTeacherApplication();

  const criticalQueriesSettled =
    !statsLoading &&
    !recentLoading &&
    !categoriesLoading &&
    (!needsTeacherApplication || !applicationLoading);

  useLayoutEffect(() => {
    if (criticalQueriesSettled && !didSignalReady.current) {
      didSignalReady.current = true;
      signalReady();
    }
  }, [criticalQueriesSettled, signalReady]);

  const { data: wishlistCount = 0 } = useQuery<number>({
    queryKey: queryKeys.wishlist.count(userId),
    queryFn: () => wishlistService.getCount(),
    staleTime: STALE_TIME_WISHLIST,
    enabled: Boolean(userId),
  });

  // Derived data
  const mostRecentCourse =
    recentEnrollments.length > 0 ? recentEnrollments[0] : null;

  const stats = useMemo(
    () => ({
      totalCourses: statsData?.total ?? 0,
      activeCourses: statsData?.active ?? 0,
      completedCourses: statsData?.completed ?? 0,
      notStarted: Math.max(
        0,
        (statsData?.total ?? 0) - (statsData?.started ?? 0),
      ),
    }),
    [statsData],
  );

  // Helpers
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Handlers
  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    if (!enrollment.courseSlug) return;
    navigate(
      buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, {
        courseSlug: enrollment.courseSlug,
      }),
    );
  };

  return (
    <>
      <SeoMetaTags
        title="Dashboard"
        description="User Dashboard"
        noIndex={true}
      />
      <div className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <DashboardHeroSection
          greeting={getGreeting()}
          userName={user?.firstName || user?.username}
          stats={stats}
          statsLoading={statsLoading}
          statsError={statsError}
          onRetryStats={() => void refetchStats()}
          mostRecentCourse={mostRecentCourse}
          onContinueLearning={handleContinueLearning}
        />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <TeacherApplicationBanner />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Column */}
            <div className="flex-1 space-y-8">
              <ContinueLearningSection
                enrollments={recentEnrollments}
                isLoading={recentLoading}
                isError={recentError}
                onRetry={() => void refetchRecent()}
                onContinue={handleContinueLearning}
                onViewAll={() => navigate(USER_ROUTES.LEARNING)}
                onBrowseCourses={() => navigate(USER_ROUTES.COURSES)}
              />
            </div>

            {/* Sidebar */}
            <DashboardSidebar
              wishlistCount={wishlistCount}
              categories={categories}
              onGoToLearning={() => navigate(USER_ROUTES.LEARNING)}
              onBrowseCourses={() => navigate(USER_ROUTES.COURSES)}
              onGoToWishlist={() => navigate(USER_ROUTES.WISHLIST)}
              onGoToCertificates={() => navigate(USER_ROUTES.CERTIFICATES)}
              onCategoryClick={(categoryId) =>
                navigate(`${USER_ROUTES.COURSES}?categories=${categoryId}`)
              }
              categoriesError={categoriesError}
              onRetryCategories={() => void refetchCategories()}
            />
          </div>

          {/* Recommended Courses - Full Width */}
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Popular Courses
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Popular with learners right now
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(USER_ROUTES.COURSES)}
                className="inline-flex self-start items-center gap-2 py-1 text-slate-800 font-semibold transition-colors hover:text-blue-600 sm:self-auto sm:px-4 sm:py-2 sm:bg-white sm:border sm:border-slate-200 sm:rounded-xl sm:text-slate-700 sm:font-medium sm:hover:bg-slate-50 sm:hover:text-slate-700"
              >
                Explore More
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {popularLoading ? (
              <CourseGridSkeleton count={4} columns={4} />
            ) : popularError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-white p-8 text-center"
              >
                <AlertCircle
                  className="mx-auto mb-3 h-8 w-8 text-red-500"
                  aria-hidden="true"
                />
                <p className="font-semibold text-slate-900">
                  Could not load popular courses
                </p>
                <button
                  type="button"
                  onClick={() => void refetchPopular()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
                </button>
              </div>
            ) : popularCourses.length > 0 ? (
              <CourseGrid
                courses={popularCourses}
                onCourseClick={(course: CourseResponse) =>
                  navigate(
                    buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                      courseSlug: course.slug,
                    }),
                  )
                }
                columns={4}
              />
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                No popular courses are available right now.
              </p>
            )}
          </div>

          {/* Newest Courses */}
          <NewestCoursesSection
            courses={newestCourses}
            onViewCourse={(course: CourseResponse) =>
              navigate(
                buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                  courseSlug: course.slug,
                }),
              )
            }
            onViewAll={() => navigate(USER_ROUTES.COURSES)}
            isLoading={newestLoading}
            isError={newestError}
            onRetry={() => void refetchNewest()}
          />
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
