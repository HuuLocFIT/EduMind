import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { useTeacherStatus } from "../../components/teacher/TeacherGuard";
import { teacherCourseService } from "../../services/teacher-course.service";
import { useTeacherAnalytics } from "./analytics/hooks/useTeacherAnalytics";
import { AnalyticsOverviewCards } from "./analytics/components/AnalyticsOverviewCards";
import { EnrollmentTrendChart } from "./analytics/components/EnrollmentTrendChart";
import { EarningsTrendChart } from "./analytics/components/EarningsTrendChart";
import { StudentEngagementChart } from "./analytics/components/StudentEngagementChart";
import { RatingDistributionChart } from "./analytics/components/RatingDistributionChart";
import { CoursePerformanceTable } from "./analytics/components/CoursePerformanceTable";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseStatus } from "@edumind/shared-constants";
import type { CourseResponse } from "@edumind/shared-types";
import { Button, Skeleton, Alert } from "@edumind/user-ui";
import {
  BookOpen,
  Users,
  Star,
  Plus,
  Eye,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowRight,
  DollarSign,
  HelpCircle,
} from "lucide-react";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CourseStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    [CourseStatus.DRAFT]: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      icon: <FileText className="w-3 h-3" />,
    },
    [CourseStatus.PUBLISHED]: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    [CourseStatus.ARCHIVED]: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  const { bg, text, icon } = config[status] || config[CourseStatus.DRAFT];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {status.replace("_", " ")}
    </span>
  );
};

const CoursesLoading: React.FC = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-white rounded-lg border">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 w-full">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-20 self-end sm:self-auto" />
      </div>
    ))}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isTrialTeacher, trialDaysRemaining, isTrialExpired } = useTeacherStatus();

  const { data: analytics, isLoading: analyticsLoading, isError, error } = useTeacherAnalytics();

  const { data: coursesPage, isLoading: coursesLoading } = useQuery({
    queryKey: ["teacher-recent-courses", user?.id],
    queryFn: () => teacherCourseService.getMyCourses(user!.id, { page: 0, size: 5 }),
    enabled: !!user?.id,
  });
  const recentCourses: CourseResponse[] = coursesPage?.data ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || "Teacher"}! 👋
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Here's an overview of your teaching performance.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700"
        >
          <span className="sm:hidden">Create Course</span>
          <span className="hidden sm:inline">Create New Course</span>
        </Button>
      </div>

      {/* Trial Alert */}
      {isTrialTeacher && (
        <>
          <Alert
            variant={isTrialExpired ? "error" : trialDaysRemaining && trialDaysRemaining <= 7 ? "warning" : "info"}
            title={isTrialExpired ? "Trial Period Expired" : "Trial Period Active"}
            message={
              isTrialExpired
                ? "Your trial period has ended. Please contact support to continue using the platform."
                : `You have ${trialDaysRemaining} days remaining in your trial period. Make the most of it!`
            }
          />
          {isTrialExpired && (
            <a
              href="mailto:supportedumind2026@gmail.com"
              className="inline-flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800 hover:no-underline"
            >
              <HelpCircle aria-hidden="true" className="w-3.5 h-3.5" />
              Contact Support
            </a>
          )}
        </>
      )}

      {/* Analytics Error */}
      {isError && (
        <Alert
          variant="error"
          title="Failed to load analytics"
          message={error?.message || "An error occurred while loading analytics data."}
        />
      )}

      {/* Overview Cards */}
      <AnalyticsOverviewCards data={analytics} loading={analyticsLoading} />

      {/* Charts Row 1: Enrollment & Earnings Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnrollmentTrendChart data={analytics?.monthlyEnrollments ?? []} loading={analyticsLoading} />
        <EarningsTrendChart data={analytics?.monthlyEarnings ?? []} loading={analyticsLoading} />
      </div>

      {/* Charts Row 2: Student Engagement & Rating Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentEngagementChart data={analytics?.enrollmentStatusBreakdown ?? []} loading={analyticsLoading} />
        <RatingDistributionChart data={analytics?.ratingDistribution ?? []} loading={analyticsLoading} />
      </div>

      {/* Recent Courses + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses - 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between gap-3 p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Courses</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(TEACHER_ROUTES.COURSES)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="!px-2"
              >
                View All
              </Button>
            </div>

            <div className="p-4">
              {coursesLoading ? (
                <CoursesLoading />
              ) : recentCourses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">You haven't created any courses yet.</p>
                  <Button
                    variant="primary"
                    onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700"
                  >
                    Create Your First Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:items-center">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {course.thumbnailUrl ? (
                              <img
                                src={course.thumbnailUrl}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate pr-1">{course.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                              <CourseStatusBadge status={course.status} />
                              <span className="text-sm text-gray-500">
                                {course.totalStudents ?? 0} students
                              </span>
                              {course.averageRating && (
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {course.averageRating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 self-end sm:self-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(TeacherRouteHelpers.courseDetail(course.id))}
                            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                            title="View Course"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {course.status !== CourseStatus.ARCHIVED && <button
                            onClick={() => navigate(TeacherRouteHelpers.courseEdit(course.id))}
                            className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                            title="Edit Course"
                          >
                            <Edit className="w-4 h-4" />
                          </button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - 1 column */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Course</p>
                <p className="text-sm text-gray-500">Start a new course</p>
              </div>
            </button>

            <button
              onClick={() => navigate(TEACHER_ROUTES.COURSES)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Courses</p>
                <p className="text-sm text-gray-500">Edit your courses</p>
              </div>
            </button>

            <button
              onClick={() => navigate(TEACHER_ROUTES.STUDENTS)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Students</p>
                <p className="text-sm text-gray-500">See enrolled students</p>
              </div>
            </button>

            <button
              onClick={() => navigate(TEACHER_ROUTES.EARNINGS)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Earnings</p>
                <p className="text-sm text-gray-500">Track your revenue</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Course Performance Table */}
      <CoursePerformanceTable data={analytics?.topCourses ?? []} loading={analyticsLoading} />
    </div>
  );
};

export default TeacherDashboardPage;
