import React from "react";
import { Card } from "@edumind/user-ui";
import { Users, BookOpen, Award } from "lucide-react";

interface InstructorInfoProps {
  name: string;
  bio?: string;
  avatar?: string;
  totalStudents?: number;
  totalCourses?: number;
  rating?: number;
  totalReviews?: number;
  className?: string;
}

export const InstructorInfo: React.FC<InstructorInfoProps> = ({
  name,
  bio,
  avatar,
  totalStudents,
  totalCourses,
  rating,
  totalReviews,
  className = "",
}) => {
  const formattedStudents =
    typeof totalStudents === "number"
      ? totalStudents.toLocaleString()
      : undefined;
  const formattedCourses =
    typeof totalCourses === "number"
      ? totalCourses.toLocaleString()
      : undefined;
  const formattedReviews =
    typeof totalReviews === "number"
      ? totalReviews.toLocaleString()
      : undefined;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xl flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">{name}</h3>
          {bio && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{bio}</p>
          )}

          {/* Stats */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {formattedStudents && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {formattedStudents}
                </span>
                <span className="text-xs tracking-wide text-gray-500">
                  students
                </span>
              </div>
            )}

            {formattedCourses && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {formattedCourses}
                </span>
                <span className="text-xs tracking-wide text-gray-500">
                  courses
                </span>
              </div>
            )}

            {rating !== undefined && (
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {rating.toFixed(1)}
                </span>
                {formattedReviews && (
                  <span className="text-xs text-gray-500">
                    ({formattedReviews} reviews)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
