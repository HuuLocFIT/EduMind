import React from "react";

export const TeacherEarningsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header — mirrors TeacherEarningsPage.tsx:96-122 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
        <div>
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-200 rounded mt-1.5" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
          <div className="h-9 w-28 bg-blue-200/80 rounded-lg" />
        </div>
      </div>

      {/* Stats Grid — mirrors EarningsStats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 shadow-sm">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-28 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Charts Row — mirrors EarningsChart & TopCoursesCard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-72 bg-gray-50 rounded-lg border border-gray-100" />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg border border-gray-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Table Section — mirrors EarningsTable */}
      <div className="space-y-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="h-9 w-48 bg-white rounded-lg border border-gray-200" />
          <div className="h-9 w-24 bg-white rounded-lg border border-gray-200" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherEarningsSkeleton;
