import React from "react";
import type { TeacherCourseStat } from "@edumind/shared-types";

interface CoursePerformanceTableProps {
  data?: TeacherCourseStat[];
  loading?: boolean;
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return "bg-green-100 text-green-800";
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "PENDING_REVIEW":
      return "bg-yellow-100 text-yellow-800";
    case "ARCHIVED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const CoursePerformanceTable: React.FC<CoursePerformanceTableProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 animate-pulse space-y-4">
        <div className="h-6 w-52 bg-gray-200 rounded mb-6" />
        <div className="hidden lg:block space-y-3">
          <div className="h-10 bg-gray-50 rounded-lg border border-gray-100" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-lg" />
          ))}
        </div>
        <div className="lg:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-50 rounded-lg border border-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Top Courses Performance
        </h3>
        <div className="text-center py-8 text-gray-400">
          No course data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Top Courses Performance
      </h3>
      <div className="hidden lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Course Title
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Students
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Avg Rating
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Net Earnings
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                Completion %
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((course) => (
              <tr
                key={course.courseId}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{course.title}</div>
                </td>
                <td className="py-4 px-4 text-right text-gray-700">
                  {course.totalStudents.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-gray-700">
                  {course.averageRating > 0
                    ? course.averageRating.toFixed(1)
                    : "No rating yet"}
                </td>
                <td className="py-4 px-4 text-right text-gray-700">
                  {formatCurrency(course.netEarnings)}
                </td>
                <td className="py-4 px-4 text-right text-gray-700">
                  {course.completionRate.toFixed(1)}%
                </td>
                <td className="py-4 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      course.status
                    )}`}
                  >
                    {course.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {data.map((course) => (
          <div
            key={course.courseId}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-gray-900 leading-6 line-clamp-2">
                {course.title}
              </h4>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(
                  course.status
                )}`}
              >
                {course.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <p className="text-gray-500">Students</p>
              <p className="text-right text-gray-900 font-medium">
                {course.totalStudents.toLocaleString()}
              </p>

              <p className="text-gray-500">Avg Rating</p>
              <p className="text-right text-gray-900 font-medium">
                {course.averageRating > 0 ? course.averageRating.toFixed(1) : "No rating yet"}
              </p>

              <p className="text-gray-500">Net Earnings</p>
              <p className="text-right text-gray-900 font-medium">
                {formatCurrency(course.netEarnings)}
              </p>

              <p className="text-gray-500">Completion</p>
              <p className="text-right text-gray-900 font-medium">
                {course.completionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
