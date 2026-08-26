import React from "react";

export const ApplicationStatusSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" aria-hidden="true">
      <div className="max-w-4xl mx-auto animate-pulse">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-9 w-64 bg-gray-200 rounded-lg mx-auto mb-2" />
          <div className="h-5 w-80 bg-gray-200 rounded mx-auto" />
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-200/80 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-7 w-44 bg-amber-200/80 rounded mb-2" />
              <div className="h-4 w-72 bg-amber-200/60 rounded" />
            </div>
          </div>
        </div>

        {/* Application Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 space-y-4">
          <div className="h-6 w-44 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-5 w-40 bg-gray-200 rounded" />
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-5 w-36 bg-gray-200 rounded" />
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-5 w-36 bg-gray-200 rounded" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-5 w-64 bg-gray-200 rounded" />
          </div>

          <div>
            <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200" />
                <div className="h-4 w-28 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Status History Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 space-y-4">
          <div>
            <div className="h-6 w-36 bg-gray-200 rounded mb-1" />
            <div className="h-4 w-60 bg-gray-200 rounded" />
          </div>
          <div className="relative pt-2">
            {/* Timeline line */}
            <div className="absolute left-4 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
            <div className="space-y-5">
              {/* Item 1 */}
              <div className="relative pl-12">
                <div className="absolute left-1.5 top-4 w-4 h-4 rounded-full bg-amber-200 border-4 border-white shadow" />
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-20 bg-amber-100 rounded-full" />
                      <div className="h-4 w-4 bg-gray-200 rounded" />
                      <div className="h-6 w-24 bg-emerald-100 rounded-full" />
                    </div>
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-3 bg-gray-200 rounded-full" />
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                  </div>
                  <div className="h-12 w-full bg-gray-50 border border-gray-100 rounded-lg p-3" />
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative pl-12">
                <div className="absolute left-1.5 top-4 w-4 h-4 rounded-full bg-indigo-200 border-4 border-white shadow" />
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-20 bg-amber-100 rounded-full" />
                    </div>
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-3 bg-gray-200 rounded-full" />
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-3">
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatusSkeleton;
