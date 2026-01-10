import React from 'react';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { EnrollmentCardNew } from './EnrollmentCardNew';

interface Pagination {
  totalPages?: number;
}

interface CourseListProps {
  enrollments: EnrollmentResponse[];
  pagination?: Pagination;
  currentPage: number;
  filterStatus: 'all' | 'active' | 'completed';
  hoveredCourse: number | null;
  onPageChange: (page: number) => void;
  onHoverCourse: (id: number | null) => void;
  onContinue: (enrollment: EnrollmentResponse) => void;
  onViewDetails: (courseId: number) => void;
  onBrowseCourses: () => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  enrollments,
  pagination,
  currentPage,
  filterStatus,
  hoveredCourse,
  onPageChange,
  onHoverCourse,
  onContinue,
  onViewDetails,
  onBrowseCourses,
}) => {
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <div className="flex-1">
      {/* Course Cards */}
      <div className="space-y-4">
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No courses here yet</h3>
            <p className="text-slate-500 mb-4">Start learning something new today!</p>
            <button
              onClick={onBrowseCourses}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          enrollments.map((enrollment) => (
            <EnrollmentCardNew
              key={enrollment.id}
              enrollment={enrollment}
              isHovered={hoveredCourse === enrollment.id}
              onMouseEnter={() => onHoverCourse(enrollment.id)}
              onMouseLeave={() => onHoverCourse(null)}
              onContinue={() => onContinue(enrollment)}
              onViewDetails={() => onViewDetails(enrollment.courseId)}
            />
          ))
        )}
      </div>

      {/* Pagination - Only show for 'all' filter */}
      {filterStatus === 'all' && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => {
              if (
                i === currentPage ||
                i === currentPage - 1 ||
                i === currentPage + 1 ||
                (currentPage === 0 && i === 2) ||
                (currentPage === totalPages - 1 && i === totalPages - 3)
              ) {
                return (
                  <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-10 h-10 rounded-lg transition-all font-medium ${
                      currentPage === i
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'hover:bg-gray-100 text-gray-700 hover:scale-105'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              }
              return null;
            })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
