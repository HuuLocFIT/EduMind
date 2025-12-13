
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Button,
  Loading,
  ProgressBar,
} from '@edumind/user-ui';
import { enrollmentService } from '@user/services/index';
import type { EnrollmentResponse, EnrollmentStatsResponse } from '@edumind/shared-types';
import { BookOpen, Clock, Award, PlayCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import { useAuthStore } from '../../stores/auth.store';
import { queryKeys } from '../../lib/query-keys';
import { STALE_TIME_ENROLLMENTS } from '../../lib/query-config';

export const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [filterStatus]);

  // Fetch enrollment statistics (accurate counts from backend - single query)
  const { data: stats, isLoading: statsLoading } = useQuery<EnrollmentStatsResponse>({
    queryKey: queryKeys.enrollments.stats(userId),
    queryFn: () => enrollmentService.getMyEnrollmentStats(),
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId),
  });

  // Fetch all enrollments (for 'all' filter only, with proper pagination)
  const { data: allEnrollmentsResponse, isLoading: allLoading } = useQuery({
    queryKey: queryKeys.enrollments.me(userId, page, pageSize),
    queryFn: async () => {
      return enrollmentService.getMyEnrollments({ page, size: pageSize });
    },
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId) && filterStatus === 'all',
    placeholderData: (previousData) => previousData,
  });

  // Fetch in-progress courses (for 'active' filter)
  const { data: inProgressEnrollments = [], isLoading: inProgressLoading } = useQuery<EnrollmentResponse[]>({
    queryKey: queryKeys.enrollments.inProgress(userId),
    queryFn: () => enrollmentService.getMyInProgressCourses(),
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId) && filterStatus === 'active',
  });

  // Fetch completed courses (for 'completed' filter)
  const { data: completedEnrollments = [], isLoading: completedLoading } = useQuery<EnrollmentResponse[]>({
    queryKey: queryKeys.enrollments.completed(userId),
    queryFn: () => enrollmentService.getMyCompletedCourses(),
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId) && filterStatus === 'completed',
  });

  // Determine which data to use based on filter
  const enrollments = useMemo(() => {
    switch (filterStatus) {
      case 'active':
        return inProgressEnrollments;
      case 'completed':
        return completedEnrollments;
      default:
        return allEnrollmentsResponse?.data || [];
    }
  }, [filterStatus, allEnrollmentsResponse, inProgressEnrollments, completedEnrollments]);

  // Loading state
  const loading = statsLoading || 
    (filterStatus === 'all' && allLoading) ||
    (filterStatus === 'active' && inProgressLoading) ||
    (filterStatus === 'completed' && completedLoading);

  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    // Navigate to course player or detail page
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Learning</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
                  <p className="text-sm text-gray-600">Total Courses</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.active ?? 0}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.completed ?? 0}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.started ?? 0}</p>
                  <p className="text-sm text-gray-600">Started</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Empty State */}
        {!loading && enrollments.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterStatus === 'all'
                ? "You haven't enrolled in any courses yet"
                : `No ${filterStatus} courses`}
            </h3>
            <p className="text-gray-600 mb-6">
              Start learning by browsing our course catalog
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(USER_ROUTES.COURSES)}  
            >
              Browse Courses
            </Button>
          </Card>
        )}

        {/* Enrollments Grid */}
        {enrollments.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => (
                <EnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  onContinue={() => handleContinueLearning(enrollment)}
                  onViewCourse={() => handleViewCourse(enrollment.courseId)}
                />
              ))}
            </div>

            {/* Pagination - Only show for 'all' filter */}
            {filterStatus === 'all' && 
             allEnrollmentsResponse?.pagination && 
             (allEnrollmentsResponse.pagination.totalPages ?? 0) > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: allEnrollmentsResponse.pagination?.totalPages ?? 0 }, (_, i) => {
                    // Show first, last, current, and adjacent pages
                    if (
                      i === page ||
                      i === page - 1 ||
                      i === page + 1 ||
                      (page === 0 && i === 2) ||
                      (page === (allEnrollmentsResponse.pagination?.totalPages ?? 0) - 1 && 
                       i === (allEnrollmentsResponse.pagination?.totalPages ?? 0) - 3)
                    ) {
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={`w-10 h-10 rounded-lg transition-all font-medium ${
                            page === i
                              ? "bg-blue-600 text-white shadow-md scale-105"
                              : "hover:bg-gray-100 text-gray-700 hover:scale-105"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min((allEnrollmentsResponse?.pagination?.totalPages || 1) - 1, p + 1))}
                  disabled={page >= ((allEnrollmentsResponse?.pagination?.totalPages ?? 1) - 1)}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// Enrollment Card Component
// ============================================
interface EnrollmentCardProps {
  enrollment: EnrollmentResponse;
  onContinue: () => void;
  onViewCourse: () => void;
}

const EnrollmentCard: React.FC<EnrollmentCardProps> = ({
  enrollment,
  onContinue,
  onViewCourse,
}) => {
  const progressPercentage = enrollment.progressPercentage || 0;
  const isCompleted = enrollment.status === 'COMPLETED';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      {/* Course Thumbnail */}
      <div className="relative h-40 bg-gray-200 rounded-t-lg overflow-hidden">
        {enrollment.courseThumbnail ? (
          <img
            src={enrollment.courseThumbnail}
            alt={enrollment.courseTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {isCompleted ? (
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Award className="w-3 h-3" />
              Completed
            </span>
          ) : (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Course Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
          {enrollment.courseTitle}
        </h3>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">
              {progressPercentage}%
            </span>
          </div>
          <ProgressBar
            progress={progressPercentage}
            color={isCompleted ? 'green' : 'blue'}
            size="md"
          />
        </div>

        {/* Last Accessed */}
        {enrollment.lastAccessedAt && (
          <p className="text-xs text-gray-500 mb-4">
            Last accessed:{' '}
            {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isCompleted ? (
            <>
              <Button
                variant="primary"
                onClick={onContinue}
                className="flex-1"
              >
                Continue Learning
              </Button>
              <Button
                variant="secondary"
                onClick={onViewCourse}
              >
                Details
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={onContinue}
                className="flex-1"
              >
                Continue Learning
              </Button>
              <Button
                variant="secondary"
                onClick={onViewCourse}
              >
                Details
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};