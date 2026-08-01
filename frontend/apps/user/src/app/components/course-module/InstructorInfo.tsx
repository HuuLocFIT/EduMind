import React from "react";
import { Card, CloudinaryImage } from "@edumind/user-ui";
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
        <div
          aria-hidden="true"
          className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xl flex-shrink-0"
        >
          <CloudinaryImage
            src={avatar}
            alt=""
            widths={[128]}
            className="w-full h-full rounded-full object-cover"
          />
          {!avatar && name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="font-semibold text-lg text-gray-900 mb-1">
            {`Instructor: ${name}`}
          </h2>
          {bio && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{bio}</p>
          )}

          {/* Stats */}
          <ul className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {formattedStudents && (
              <li className="flex items-center gap-1.5">
                <span className="sr-only">{`${formattedStudents} students`}</span>
                <span aria-hidden="true" className="contents">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">{formattedStudents}</span>
                  <span className="text-xs tracking-wide text-gray-500">students</span>
                </span>
              </li>
            )}

            {formattedCourses && (
              <li className="flex items-center gap-1.5">
                <span className="sr-only">{`${formattedCourses} courses`}</span>
                <span aria-hidden="true" className="contents">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">{formattedCourses}</span>
                  <span className="text-xs tracking-wide text-gray-500">courses</span>
                </span>
              </li>
            )}

            {rating !== undefined && (
              <li className="flex items-center gap-1.5">
                <span className="sr-only">
                  {`${rating.toFixed(1)} out of 5 stars${formattedReviews ? `, ${formattedReviews} reviews` : ""}`}
                </span>
                <span aria-hidden="true" className="contents">
                  <Award className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
                  {formattedReviews && <span className="text-xs text-gray-500">({formattedReviews} reviews)</span>}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
};
