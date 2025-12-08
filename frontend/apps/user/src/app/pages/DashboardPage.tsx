import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Loading,
} from '@edumind/user-ui';
import { useAuthStore } from '../stores/auth.store';
import {
  enrollmentService,
  courseService,
  wishlistService,
} from '@user/services/index';
import { CourseGrid } from '../components/course-module';
import { EnrollmentCard } from '../components/course-module/EnrollmentCard';
import type {
  EnrollmentResponse,
  CourseResponse,
} from '@edumind/shared-types';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Heart,
  Calendar,
  Target,
  Zap,
  LucideIcon,
} from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import TeacherApplicationBanner from '@user/components/TeacherApplicationBanner';

// StatCard Component
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [loading, setLoading] = useState(true);
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentResponse[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<CourseResponse[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeCourses: 0,
    completedCourses: 0,
    totalHoursLearned: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch enrollments
      const enrollmentsData = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const enrollments = enrollmentsData.data || [];
      
      // Get recent 3 enrollments
      setRecentEnrollments(enrollments.slice(0, 3));

      // Calculate stats
      setStats({
        totalCourses: enrollments.length,
        activeCourses: enrollments.filter((e: EnrollmentResponse) => e.status === 'ACTIVE').length,
        completedCourses: enrollments.filter((e: EnrollmentResponse) => e.status === 'COMPLETED').length,
        totalHoursLearned: 0, // TODO: Calculate from course duration and progress
        currentStreak: 7, // TODO: Implement streak calculation
      });

      // Fetch recommended courses
      const recommendedData = await courseService.getMostPopularCourses({ page: 0, size: 4 });
      setRecommendedCourses(recommendedData.data || []);

      // Fetch wishlist count
      const count = await wishlistService.getCount();
      setWishlistCount(count);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {user?.firstName || user?.username}! 👋
          </h1>
          <p className="text-blue-100">
            Welcome back to your learning journey
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeacherApplicationBanner />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={BookOpen}
            label="Total Courses"
            value={stats.totalCourses}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="In Progress"
            value={stats.activeCourses}
            color="green"
          />
          <StatCard
            icon={Award}
            label="Completed"
            value={stats.completedCourses}
            color="purple"
          />
          <StatCard
            icon={Clock}
            label="Hours Learned"
            value={`${stats.totalHoursLearned}h`}
            color="orange"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Continue Learning */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
              <Button
                variant="secondary"
                onClick={() => navigate(USER_ROUTES.LEARNING)}
              >
                View All
              </Button>
            </div>

            {recentEnrollments.length > 0 ? (
              <div className="space-y-4">
                {recentEnrollments.map((enrollment) => (
                  <EnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onClick={() => navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseId: enrollment.courseId }))}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No courses yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start learning by enrolling in a course
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate(USER_ROUTES.COURSES)}
                >
                  Browse Courses
                </Button>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Learning Streak */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.currentStreak} days
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Keep it up! Learn something new every day 🔥
              </p>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(USER_ROUTES.COURSES)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Browse Courses</span>
                </button>
                
                <button
                  onClick={() => navigate(USER_ROUTES.WISHLIST)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Heart className="w-5 h-5 text-red-500" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-gray-900">My Wishlist</span>
                    {wishlistCount > 0 && (
                      <span className="text-sm text-gray-500">
                        {wishlistCount} {wishlistCount === 1 ? 'course' : 'courses'}
                      </span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => navigate(USER_ROUTES.PROFILE_SETTINGS)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Learning Goals</span>
                </button>

                <button
                  onClick={() => navigate(USER_ROUTES.CERTIFICATES)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Award className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Certificates</span>
                </button>
              </div>
            </Card>

            {/* Upcoming Events - Phase 4 */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Upcoming</h3>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5" />
                <p className="text-sm">No upcoming events</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Recommended Courses */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
              <p className="text-gray-600 mt-1">Based on your learning history</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(USER_ROUTES.COURSES)}
            >
              Explore More
            </Button>
          </div>

          <CourseGrid
            courses={recommendedCourses}
            onCourseClick={(course: CourseResponse) => navigate(`/courses/${course.id}`)}
            columns={4}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;