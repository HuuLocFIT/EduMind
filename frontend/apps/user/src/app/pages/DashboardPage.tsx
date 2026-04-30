import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@edumind/user-ui";
import { useAuthStore } from "../stores/auth.store";
import { enrollmentService } from '../services/enrollment.service';
import { courseService } from '../services/course.service';
import { wishlistService } from '../services/wishlist.service';
import { CourseGrid } from "../components/course-module";
import type { EnrollmentResponse, CourseResponse } from "@edumind/shared-types";
import { queryKeys } from "../lib/query-keys";
import {
  STALE_TIME_ENROLLMENTS,
  STALE_TIME_COURSES_PUBLIC,
  STALE_TIME_WISHLIST,
} from "../lib/query-config";
import { ChevronRight, ThumbsUp } from "lucide-react";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import TeacherApplicationBanner from "../components/TeacherApplicationBanner";

// Import split components
import {
  DashboardHeroSection,
  ContinueLearningSection,
  DashboardSidebar,
  CategoriesSection,
  NewestCoursesSection,
} from './dashboard/components';
import { categoryService } from "../services/category.service";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;
  const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);

  // Data fetching
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<
    EnrollmentResponse[]
  >({
    queryKey: queryKeys.enrollments.me(userId),
    queryFn: async () => {
      const response = await enrollmentService.getMyEnrollments({
        page: 0,
        size: 100,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId),
  });

  const { data: recommendedCourses = [], isLoading: recommendedLoading } =
    useQuery<CourseResponse[]>({
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

  const { data: newestCourses = [], isLoading: newestLoading } =
    useQuery<CourseResponse[]>({
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

  const { data: categories = [], isLoading: categoriesLoading } =
    useQuery({
      queryKey: queryKeys.categories.active,
      queryFn: async () => {
        const response = await categoryService.getActiveCategories();
        // @ts-expect-error - API response shape varies between direct array and wrapped object
        return response.data || response || [];
      },
      staleTime: Infinity, // Categories change rarely
    });

  const { data: wishlistCount = 0, isLoading: wishlistLoading } =
    useQuery<number>({
      queryKey: queryKeys.wishlist.count(userId),
      queryFn: () => wishlistService.getCount(),
      staleTime: STALE_TIME_WISHLIST,
      enabled: Boolean(userId),
    });

  // Derived data
  const recentEnrollments = useMemo(
    () => enrollments.slice(0, 3),
    [enrollments]
  );

  const stats = useMemo(
    () => ({
      totalCourses: enrollments.length,
      activeCourses: enrollments.filter((e) => e.status === "ACTIVE").length,
      completedCourses: enrollments.filter((e) => e.status === "COMPLETED").length,
      notStarted: enrollments.filter((e) => e.progressPercentage === 0).length,
      currentStreak: 7, // TODO: Implement streak calculation
    }),
    [enrollments]
  );

  const mostRecentCourse = useMemo(() => {
    if (enrollments.length === 0) return null;
    return [...enrollments].sort(
      (a, b) => new Date(b.lastAccessedAt || b.enrolledAt).getTime() - new Date(a.lastAccessedAt || a.enrolledAt).getTime()
    )[0];
  }, [enrollments]);

  const loading = enrollmentsLoading || recommendedLoading || wishlistLoading || newestLoading || categoriesLoading;

  // Helpers
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Handlers
  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseId: enrollment.courseId }));
  };

  const handleViewCourse = (courseId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: courseId || '' }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <DashboardHeroSection
        greeting={getGreeting()}
        userName={user?.firstName || user?.username}
        stats={stats}
        mostRecentCourse={mostRecentCourse}
        onContinueLearning={handleContinueLearning}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <TeacherApplicationBanner />

        <CategoriesSection
          categories={categories}
          onCategoryClick={(categoryId) =>
            navigate(`${USER_ROUTES.COURSES}?categories=${categoryId}`)
          }
        />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Column */}
          <div className="flex-1 space-y-8">
            <ContinueLearningSection
              enrollments={recentEnrollments}
              hoveredCourse={hoveredCourse}
              onHoverCourse={setHoveredCourse}
              onContinue={handleContinueLearning}
              onViewDetails={handleViewCourse}
              onViewAll={() => navigate(USER_ROUTES.LEARNING)}
              onBrowseCourses={() => navigate(USER_ROUTES.COURSES)}
            />
          </div>

          {/* Sidebar */}
          <DashboardSidebar
            currentStreak={stats.currentStreak}
            wishlistCount={wishlistCount}
            onBrowseCourses={() => navigate(USER_ROUTES.COURSES)}
            onGoToWishlist={() => navigate(USER_ROUTES.WISHLIST)}
            onGoToGoals={() => navigate(USER_ROUTES.PROFILE_SETTINGS)}
            onGoToCertificates={() => navigate(USER_ROUTES.CERTIFICATES)}
          />
        </div>

        {/* Recommended Courses - Full Width */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ThumbsUp className="w-6 h-6 text-blue-600" />
                Recommended for You
              </h2>
              <p className="text-slate-500 text-sm mt-1">Based on your learning history</p>
            </div>
            <button
              onClick={() => navigate(USER_ROUTES.COURSES)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Explore More
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <CourseGrid
            courses={recommendedCourses}
            onCourseClick={(course: CourseResponse) =>
              navigate(
                buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                  courseId: course.id,
                })
              )
            }
            columns={4}
          />
        </div>

        {/* Newest Courses */}
        <NewestCoursesSection
          courses={newestCourses}
          onViewCourse={(course: CourseResponse) =>
            navigate(
              buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                courseId: course.id,
              })
            )
          }
          onViewAll={() => navigate(USER_ROUTES.COURSES)}
        />
      </main>
    </div>
  );
};

export default DashboardPage;
