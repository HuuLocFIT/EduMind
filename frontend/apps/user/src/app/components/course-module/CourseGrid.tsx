import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CourseCard } from "./CourseCard";
import type { CourseResponse } from "@edumind/shared-types";
import { BookOpen } from "lucide-react";
import { prefetchCourseDetail } from "../../lib/prefetch";

interface CourseGridProps {
  courses: CourseResponse[];
  onCourseClick?: (course: CourseResponse) => void;
  columns?: 2 | 3 | 4;
  className?: string;
  // Action props
  showActions?: boolean;
  enrolledCourseIds?: Set<number>;
  cartCourseIds?: Set<number>;
  addingToCartIds?: Set<number>;
  enrollingCourseIds?: Set<number>;
  onAddToCart?: (courseId: number) => void;
  onGoToCourse?: (courseId: number) => void;
  onEnrollFree?: (courseId: number) => void;
}

export const CourseGrid: React.FC<CourseGridProps> = ({
  courses,
  onCourseClick,
  columns = 3,
  className = "",
  showActions = false,
  enrolledCourseIds = new Set(),
  cartCourseIds = new Set(),
  addingToCartIds = new Set(),
  enrollingCourseIds = new Set(),
  onAddToCart,
  onGoToCourse,
  onEnrollFree,
}) => {
  const queryClient = useQueryClient();

  const gridClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No courses found</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClasses[columns]} gap-3 sm:gap-4 lg:gap-6 ${className}`}>
      {courses.map((course, index) => (
        <CourseCard
          key={course.id}
          course={course}
          onClick={() => onCourseClick?.(course)}
          onHover={() => prefetchCourseDetail(queryClient, course.id)}
          showActions={showActions}
          isEnrolled={enrolledCourseIds.has(course.id)}
          isInCart={cartCourseIds.has(course.id)}
          isAddingToCart={addingToCartIds.has(course.id)}
          isEnrolling={enrollingCourseIds.has(course.id)}
          onAddToCart={onAddToCart}
          onGoToCourse={onGoToCourse}
          onEnrollFree={onEnrollFree}
          priority={index < 4}
        />
      ))}
    </div>
  );
};

