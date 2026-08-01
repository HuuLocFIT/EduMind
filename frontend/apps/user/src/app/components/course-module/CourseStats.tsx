import React from "react";
import { Users, Clock, BookOpen, Star } from "lucide-react";

interface CourseStatsProps {
  totalStudents?: number;
  duration?: number;
  totalLessons?: number;
  averageRating?: number;
  className?: string;
}

export const CourseStats: React.FC<CourseStatsProps> = ({
  totalStudents,
  duration, 
  totalLessons,
  averageRating,
  className = "",
}) => {
  const stats = [
    {
      icon: Users,
      label: "Students",
      value: totalStudents,
      accessibleText: totalStudents !== undefined ? `${totalStudents.toLocaleString()} students` : undefined,
    },
    {
      icon: Clock,
      label: "Duration",
      value: duration ? `${duration}h` : undefined,
      accessibleText: duration ? `${duration} hours duration` : undefined,
    },
    {
      icon: BookOpen,
      label: "Lessons",
      value: totalLessons,
      accessibleText: totalLessons !== undefined ? `${totalLessons.toLocaleString()} lessons` : undefined,
    },
    {
      icon: Star,
      label: "Rating",
      value: averageRating ? averageRating.toFixed(1) : undefined,
      accessibleText: averageRating ? `${averageRating.toFixed(1)} out of 5 stars` : undefined,
    },
  ].filter((stat) => stat.value !== undefined);

  return (
    <ul className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <li key={index} className="flex items-center gap-2 text-gray-600">
            <span className="sr-only">{stat.accessibleText}</span>
            <span aria-hidden="true" className="contents">
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span>
                <span className="block font-semibold text-gray-900">{stat.value}</span>
                <span className="block text-sm">{stat.label}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};
