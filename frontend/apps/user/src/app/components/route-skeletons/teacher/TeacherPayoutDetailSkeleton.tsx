import React from "react";

export const TeacherPayoutDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header — mirrors TeacherPayoutDetailPage.tsx:128-165 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-4 animate-pulse">
            {/* Back Button */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex-shrink-0" />
                <div>
                  <div className="h-8 lg:h-9 w-56 bg-gray-200 rounded-lg" />
                  <div className="h-4 w-48 bg-gray-200 rounded mt-1" />
                </div>
              </div>

              <div className="h-9 w-28 rounded-full bg-gray-200 flex-shrink-0 self-start md:self-center" />
            </div>
          </div>
        </div>
      </div>

      {/* Content — mirrors TeacherPayoutDetailPage.tsx:168-344 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar Card */}
          <div className="order-1 lg:order-2 lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-4">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="h-5 sm:h-6 w-36 bg-gray-200 rounded" />
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-5 w-24 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
                <div className="pt-3 sm:pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                  <div className="h-7 w-28 rounded-full bg-gray-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Card 1: Payout Information */}
            <div className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex-shrink-0" />
                <div className="h-6 sm:h-7 w-48 bg-gray-200 rounded" />
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="h-3.5 w-28 bg-gray-200 rounded" />
                  <div className="h-5 w-44 bg-gray-200 rounded" />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="h-3.5 w-28 bg-gray-200 rounded" />
                  <div className="h-5 w-44 bg-gray-200 rounded" />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="h-3.5 w-28 bg-gray-200 rounded" />
                  <div className="h-5 w-44 bg-gray-200 rounded" />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="h-3.5 w-28 bg-gray-200 rounded" />
                  <div className="h-5 w-44 bg-gray-200 rounded" />
                </div>
              </div>
            </div>

            {/* Card 2: Payout Items Table Card */}
            <div className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex-shrink-0" />
                <div className="h-6 sm:h-7 w-40 bg-gray-200 rounded" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <div className="h-4 w-16 bg-gray-200 rounded" />
                      </th>
                      <th className="px-4 py-3">
                        <div className="h-4 w-16 bg-gray-200 rounded" />
                      </th>
                      <th className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="h-4 w-44 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="h-4 w-44 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="h-4 w-44 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPayoutDetailSkeleton;

