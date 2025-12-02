import React from "react";
import { Card } from "@edumind/user-ui";
import { RatingStars } from "@edumind/user-ui";
import { PriceTag } from "@edumind/user-ui";
import { Clock, Users, BookOpen } from "lucide-react";
import { type CourseDetailResponse } from "@edumind/shared-types";

interface CourseCardProps {
  course: CourseDetailResponse;
  onClick?: () => void;
  className?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onClick,
  className = "",
}) => {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Course Thumbnail */}
      <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {/* Badge - Level */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {course.level}
        </div>
      </div>

      {/* Course Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
          {course.title}
        </h3>

        {/* Instructor */}
        <p className="text-sm text-gray-600 mb-3">
          {course.instructorName || "Instructor"}
        </p>

        {/* Rating */}
        <div className="flex items-center mb-3">
          <RatingStars
            rating={course.averageRating || 0}
            size="sm"
            showNumber
          />
          <span className="ml-2 text-sm text-gray-500">
            ({course.totalReviews || 0})
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{course.totalStudents || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.durationHours || 0}h</span>
          </div>
        </div>

        {/* Price */}
        <PriceTag
          price={course.effectivePrice ?? course.discountPrice ?? course.price}
          originalPrice={course.discountPrice ? course.price : undefined}
          size="md"
        />
      </div>
    </Card>
  );
};
