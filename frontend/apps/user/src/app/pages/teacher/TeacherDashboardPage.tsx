import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { useTeacherStatus } from "../../components/teacher/TeacherGuard";
import { teacherCourseService } from '@user/services/index';
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseStatus } from "@edumind/shared-constants";
import type {
  InstructorStatsResponse,
  CourseResponse,
} from "@edumind/shared-types";
import {
  StatCard,
  Button,
  Skeleton,
  Alert
} from "@edumind/user-ui";
import {
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowRight,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface DashboardData {
  stats: InstructorStatsResponse | null;
  recentCourses: CourseResponse[];
  // recentReviews: ReviewResponse[]; // Future: when API available
}

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
    [CourseStatus.PENDING_REVIEW]: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: <Clock className="w-3 h-3" />,
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
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {status.replace("_", " ")}
    </span>
  );
};

const StatsLoading: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl p-6 border">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    ))}
  </div>
);

const CoursesLoading: React.FC = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 bg-white rounded-lg border"
      >
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
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

  const [data, setData] = useState<DashboardData>({
    stats: null,
    recentCourses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch stats and courses in parallel
        const [statsResponse, coursesResponse] = await Promise.all([
          teacherCourseService.getMyStats(user.id),
          teacherCourseService.getMyCourses(user.id, { page: 0, size: 5 }),
        ]);

        setData({
          stats: statsResponse,
          recentCourses: coursesResponse.data || [],
        });
      } catch (err: any) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const { stats, recentCourses } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || "Teacher"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your courses today.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Create New Course
        </Button>
      </div>

      {/* Trial Alert */}
      {isTrialTeacher && (
        <Alert
          variant={isTrialExpired ? "error" : trialDaysRemaining && trialDaysRemaining <= 7 ? "warning" : "info"}
          title={isTrialExpired ? "Trial Period Expired" : "Trial Period Active"}
          message={
            isTrialExpired
              ? "Your trial period has ended. Please contact support to continue using the platform."
              : `You have ${trialDaysRemaining} days remaining in your trial period. Make the most of it!`
          }
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Stats Cards */}
      {loading ? (
        <StatsLoading />
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Courses"
            value={stats.totalCourses ?? 0}
            icon={<BookOpen className="w-6 h-6" />}
          />
          <StatCard
            title="Total Students"
            value={stats.totalStudents ?? 0}
            icon={<Users className="w-6 h-6" />}
          />
          <StatCard
            title="Total Reviews"
            value={stats.totalReviews ?? 0}
            icon={<Star className="w-6 h-6" />}
          />
          <StatCard
            title="Average Rating"
            value={stats.averageRating?.toFixed(1) ?? "N/A"}
            icon={<TrendingUp className="w-6 h-6" />}
          />
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Courses
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(TEACHER_ROUTES.COURSES)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                View All
              </Button>
            </div>

            <div className="p-4">
              {loading ? (
                <CoursesLoading />
              ) : recentCourses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">
                    You haven't created any courses yet.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Create Your First Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {/* Thumbnail */}
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
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

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            navigate(TeacherRouteHelpers.courseDetail(course.id))
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="View Course"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(TeacherRouteHelpers.courseEdit(course.id))
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Edit Course"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Tips - Takes 1 column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
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
                onClick={() => navigate(TEACHER_ROUTES.ANALYTICS)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Analytics</p>
                  <p className="text-sm text-gray-500">View performance</p>
                </div>
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              💡 Tips for Success
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Create engaging video content with clear audio</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Break down lessons into 5-15 minute segments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Respond to student questions promptly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Update course content regularly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
