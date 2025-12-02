import React from "react";
import { Users, Clock, BookOpen, Award } from "lucide-react";

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
    { icon: Users, label: "Students", value: totalStudents },
    {
      icon: Clock,
      label: "Duration",
      value: duration ? `${duration}h` : undefined,
    },
    { icon: BookOpen, label: "Lessons", value: totalLessons },
    {
      icon: Award,
      label: "Rating",
      value: averageRating ? averageRating.toFixed(1) : undefined,
    },
  ].filter((stat) => stat.value !== undefined);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="flex items-center gap-2 text-gray-600">
            <Icon className="w-5 h-5" />
            <div>
              <p className="font-semibold text-gray-900">{stat.value}</p>
              <p className="text-sm">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
