import React from "react";

export const TeacherPayoutsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header — mirrors TeacherPayoutsPage.tsx */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded-lg" />
          <div className="h-5 w-64 bg-gray-200 rounded mt-1" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-lg flex-shrink-0" />
      </div>

      {/* Tabs list skeleton — mirrors Tabs */}
      <div className="h-10 w-52 bg-gray-200 rounded-lg mb-4 animate-pulse" />

      {/* Stats Grid — mirrors PayoutSummaryCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-1.5" />
              <div className="h-7 w-20 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Payout History Title Skeleton */}
      <div className="animate-pulse">
        <div className="h-6 w-36 bg-gray-200 rounded-lg" />
        <div className="h-4 w-48 bg-gray-200 rounded mt-1" />
      </div>

      {/* Table Section — mirrors PayoutsTable */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout #
                </th>
                <th className="w-1/6 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="w-1/6 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="w-1/6 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-6 w-28 bg-gray-200 rounded-full mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-6 w-20 bg-gray-200 rounded-full mx-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherPayoutsSkeleton;

