
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Loading,
  ProgressBar,
} from '@edumind/user-ui';
import { enrollmentService } from '../../services';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen, Clock, Award, PlayCircle, TrendingUp } from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';

export const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      setEnrollments(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch enrollments');
      console.error('Error fetching enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLearning = (enrollment: EnrollmentResponse) => {
    // Navigate to course player or detail page
    navigate(buildRouteWithParams(USER_ROUTES.LEARNING_COURSE, { courseId: enrollment.courseId }));
  };

  const handleViewCourse = (courseId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, { courseId: courseId || '' }));
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return enrollment.status === 'ACTIVE';
    if (filterStatus === 'completed') return enrollment.status === 'COMPLETED';
    return true;
  });

  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === 'ACTIVE').length,
    completed: enrollments.filter(e => e.status === 'COMPLETED').length,
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
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {enrollments.filter(e => e.progressPercentage && e.progressPercentage > 0).length}
                  </p>
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
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <Button
              variant="secondary"
              onClick={fetchEnrollments}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEnrollments.length === 0 && (
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
              onClick={() => navigate('/courses')}
            >
              Browse Courses
            </Button>
          </Card>
        )}

        {/* Enrollments Grid */}
        {filteredEnrollments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEnrollments.map((enrollment) => (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                onContinue={() => handleContinueLearning(enrollment)}
                onViewCourse={() => handleViewCourse(enrollment.courseId)}
              />
            ))}
          </div>
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