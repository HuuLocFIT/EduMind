import React from "react";

export const TeacherDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6" aria-hidden="true">
      {/* Header — mirrors TeacherDashboardPage.tsx:107-125 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
        <div>
          <div className="h-7 sm:h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="h-4 w-72 sm:w-80 bg-gray-200 rounded mt-1.5" />
        </div>
        <div className="h-10 w-36 bg-green-200/80 rounded-lg flex-shrink-0" />
      </div>

      {/* Overview Cards — mirrors AnalyticsOverviewCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 flex items-start justify-between gap-3"
          >
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-7 w-20 bg-gray-200 rounded-lg" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="h-6 w-44 bg-gray-200 rounded mb-4 sm:mb-6" />
            <div className="h-[260px] sm:h-[300px] w-full bg-gray-50 rounded-lg border border-gray-100" />
          </div>
        ))}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="h-6 w-44 bg-gray-200 rounded mb-4 sm:mb-6" />
            <div className="h-[260px] sm:h-[300px] w-full bg-gray-50 rounded-lg border border-gray-100" />
          </div>
        ))}
      </div>

      {/* Recent Courses + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div className="h-6 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded pb-2 border-b border-gray-100" />
          <div className="space-y-2">
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Course Performance Table */}
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
    </div>
  );
};

export default TeacherDashboardSkeleton;
