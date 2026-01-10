import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loading } from '@edumind/user-ui';
import { enrollmentService } from '../../services/enrollment.service';
import type {
  EnrollmentResponse,
  EnrollmentStatsResponse,
} from '@edumind/shared-types';
import { EnrollmentStatus } from '@edumind/shared-constants';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import { useAuthStore } from '../../stores/auth.store';
import { queryKeys } from '../../lib/query-keys';
import { STALE_TIME_ENROLLMENTS } from '../../lib/query-config';

// Import split components
import {
  HeroSection,
  CourseFilters,
  CourseList,
  LearningSidebar,
  type FilterStatus,
} from './components';

export const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page, setPage] = useState(0);
  const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);
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

  // Business rule:
  // - DROPPED enrollments should not appear in My Learning at all.
  // - SUSPENDED enrollments are still visible but shown as locked.
  const visibleEnrollments = useMemo(
    () =>
      (enrollments || []).filter(
        (enrollment) => enrollment.status !== EnrollmentStatus.DROPPED
      ),
    [enrollments]
  );

  // Loading state
  const loading =
    statsLoading ||
    (filterStatus === 'all' && allLoading) ||
    (filterStatus === 'active' && inProgressLoading) ||
    (filterStatus === 'completed' && completedLoading);

  // Find most recent course for "Continue Learning"
  const mostRecentCourse = useMemo(() => {
    const allData = allEnrollmentsResponse?.data || [];
    if (allData.length === 0) return null;
    return [...allData].sort(
      (a, b) => new Date(b.lastAccessedAt || b.enrolledAt).getTime() - new Date(a.lastAccessedAt || a.enrolledAt).getTime()
    )[0];
  }, [allEnrollmentsResponse]);

  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseId: enrollment.courseId }));
  };

  const handleViewCourse = (courseId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: courseId || '' }));
  };

  const handleBrowseCourses = () => {
    navigate(USER_ROUTES.COURSES);
  };

  const handleStartLearning = () => {
    if (mostRecentCourse) {
      handleContinueLearning(mostRecentCourse);
    }
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
      {/* Hero Section with Welcome & Stats */}
      <HeroSection
        userName={user?.firstName || ''}  
        stats={stats}
        mostRecentCourse={mostRecentCourse}
        onContinueLearning={handleContinueLearning}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Courses List Section */}
          <div className="flex-1">
            {/* Filters */}
            <CourseFilters
              activeFilter={filterStatus}
              onFilterChange={setFilterStatus}
              stats={stats}
            />

            {/* Course List */}
            <CourseList
              enrollments={visibleEnrollments}
              pagination={allEnrollmentsResponse?.pagination}
              currentPage={page}
              filterStatus={filterStatus}
              hoveredCourse={hoveredCourse}
              onPageChange={setPage}
              onHoverCourse={setHoveredCourse}
              onContinue={handleContinueLearning}
              onViewDetails={handleViewCourse}
              onBrowseCourses={handleBrowseCourses}
            />
          </div>

          {/* Sidebar */}
          <LearningSidebar
            stats={stats}
            enrollments={visibleEnrollments}
            onStartLearning={handleStartLearning}
            onBrowseCourses={handleBrowseCourses}
          />
        </div>
      </main>
    </div>
  );
};

export default MyLearningPage;