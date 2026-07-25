import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen, ChevronRight } from 'lucide-react';
import { DashboardEnrollmentCard } from './DashboardEnrollmentCard';
import { prefetchCourseDetail } from '../../../lib/prefetch';

interface ContinueLearningSectionProps {
  enrollments: EnrollmentResponse[];
  hoveredCourse: number | null;
  onHoverCourse: (id: number | null) => void;
  onContinue: (enrollment: EnrollmentResponse) => void;
  onViewDetails: (courseId: number) => void;
  onViewAll: () => void;
  onBrowseCourses: () => void;
}

export const ContinueLearningSection: React.FC<ContinueLearningSectionProps> = ({
  enrollments,
  hoveredCourse,
  onHoverCourse,
  onContinue,
  onViewDetails,
  onViewAll,
  onBrowseCourses,
}) => {
  const queryClient = useQueryClient();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Continue Learning
          </h2>
          <p className="text-slate-500 text-sm mt-1">Pick up where you left off</p>
        </div>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {enrollments.length > 0 ? (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <DashboardEnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              isHovered={hoveredCourse === enrollment.id}
              onMouseEnter={() => {
                onHoverCourse(enrollment.id);
                prefetchCourseDetail(queryClient, enrollment.courseId);
              }}
              onMouseLeave={() => onHoverCourse(null)}
              onContinue={() => onContinue(enrollment)}
              onViewDetails={() => onViewDetails(enrollment.courseId)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No courses yet</h3>
          <p className="text-slate-500 mb-4">Start learning by enrolling in a course</p>
          <button
            onClick={onBrowseCourses}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
          >
            Browse Courses
          </button>
        </div>
      )}
    </div>
  );
};
