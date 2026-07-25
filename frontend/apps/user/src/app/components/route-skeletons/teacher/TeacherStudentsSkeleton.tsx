import React from "react";

export const TeacherStudentsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header — mirrors TeacherStudentsPage.tsx:109-126 */}
      <div className="flex items-center justify-between animate-pulse">
        <div>
          <div className="h-8 w-44 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-200 rounded mt-1" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg flex-shrink-0" />
      </div>

      {/* Stats — mirrors StudentsStats (grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-200 flex-shrink-0" />
              <div className="min-w-0 space-y-2 flex-1">
                <div className="h-3.5 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters — mirrors StudentsFilters (Course selector, Search, Status filter) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 animate-pulse">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Course selector */}
          <div className="w-full lg:w-64 space-y-1">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>

          {/* Search */}
          <div className="flex-1 space-y-1">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>

          {/* Status filter */}
          <div className="w-full lg:w-48 space-y-1">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table — mirrors StudentsTable with Table Header and 5 rows + Pagination */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-16 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-14 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-20 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-16 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-12 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-16 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-20 bg-gray-200 rounded" />
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="h-3.5 w-14 bg-gray-200 rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {/* Student */}
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 bg-gray-200 rounded" />
                      <div className="h-3 w-36 bg-gray-200 rounded" />
                    </div>
                  </td>
                  {/* Course */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gray-200 flex-shrink-0" />
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                  </td>
                  {/* Course Type */}
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </td>
                  {/* Progress */}
                  <td className="px-4 py-3">
                    <div className="w-32 space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-3 w-8 bg-gray-200 rounded" />
                        <div className="h-3 w-8 bg-gray-200 rounded" />
                      </div>
                      <div className="h-2 w-full bg-gray-200 rounded-full" />
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </td>
                  {/* Enrolled */}
                  <td className="px-4 py-3">
                    <div className="h-3.5 w-20 bg-gray-200 rounded" />
                  </td>
                  {/* Last Access */}
                  <td className="px-4 py-3">
                    <div className="h-3.5 w-20 bg-gray-200 rounded" />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="flex items-center gap-1">
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Info Note Skeleton */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-200 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-blue-200 rounded" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-full max-w-2xl bg-blue-200/70 rounded" />
              <div className="h-3.5 w-full max-w-xl bg-blue-200/70 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentsSkeleton;

