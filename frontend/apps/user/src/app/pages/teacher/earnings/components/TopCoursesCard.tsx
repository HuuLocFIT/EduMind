import React from "react";
import { CourseEarningResponse } from "@edumind/shared-types";
import { BookOpen } from "lucide-react";

interface TopCoursesCardProps {
  courses: CourseEarningResponse[];
  loading?: boolean;
}

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const TopCoursesCard: React.FC<TopCoursesCardProps> = ({ courses, loading }) => {
  if (loading) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-full flex items-center justify-center">
            <div className="space-y-4 w-full">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                {[1, 2, 3].map(i => (
                     <div key={i} className="flex justify-between items-center">
                        <div className="flex gap-2 w-2/3">
                            <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                         </div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                     </div>
                ))}
            </div>
        </div>
    );
  }

  // Handle empty state
  if (!courses || courses.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
             <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
             <p className="text-gray-500 font-medium">No sales yet</p>
             <p className="text-sm text-gray-400">Your top courses will appear here</p>
        </div>
      );
  }

  const maxEarnings = Math.max(...courses.map(c => c.totalNetEarnings));
  const safeMax = maxEarnings > 0 ? maxEarnings : 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Earnings by Course</h3>
          <p className="text-sm text-gray-500">Top performing courses</p>
        </div>
      </div>
      
      <div className="space-y-5">
        {courses.map((course, i) => {
          const percentage = (course.totalNetEarnings / safeMax) * 100;
          
          return (
            <div key={course.courseId} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors" title={course.courseTitle || "Untitled Course"}>
                        {course.courseTitle || "Untitled Course"}
                      </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{course.salesCount} sales</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(course.totalNetEarnings, course.currency)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-indigo-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
