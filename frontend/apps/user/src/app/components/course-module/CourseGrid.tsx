import React from "react";
import { CourseCard } from "./CourseCard";
import type { CourseResponse } from "@edumind/shared-types";
import { BookOpen } from "lucide-react";

interface CourseGridProps {
  courses: CourseResponse[];
  onCourseClick?: (course: CourseResponse) => void;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const CourseGrid: React.FC<CourseGridProps> = ({
  courses,
  onCourseClick,
  columns = 3,
  className = "",
}) => {
  const gridClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
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
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onClick={() => onCourseClick?.(course)}
        />
      ))}
    </div>
  );
};
