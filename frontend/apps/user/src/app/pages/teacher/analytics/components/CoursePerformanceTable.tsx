import React from "react";
import { Skeleton } from "@edumind/user-ui";
import type { TeacherCourseStat } from "@edumind/shared-types";

interface CoursePerformanceTableProps {
  data?: TeacherCourseStat[];
  loading?: boolean;
}

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
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200">
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
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Top Courses Performance
      </h3>
      <div className="overflow-x-auto">
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
                  ${course.netEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
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
    </div>
  );
};
