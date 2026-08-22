import React from "react";

/**
 * Full-page skeleton for the Course Detail route.
 *
 * Reproduces the real layout: a blue gradient hero with a two-thirds text
 * column and a one-third white purchase card, followed by the content column
 * below. Used BOTH as the Suspense fallback (chunk loading) AND as the page's
 * own loading state (courseLoading), so the user sees one continuous skeleton
 * that the real content drops straight into — no spinner, no reflow.
 */
export const CourseDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero (matches CourseDetailPage hero) */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Back / category pills */}
          <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4 animate-pulse">
            <div className="h-[42px] w-[170px] bg-white/20 rounded-full" />
            <div className="h-[42px] w-[71px] bg-white/15 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: title / subtitle / meta */}
            <div className="lg:col-span-2 animate-pulse">
              <div className="h-10 md:h-12 w-full max-w-[747px] bg-white/25 rounded-lg mb-4" />
              <div className="h-0 mb-6" />
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="h-6 w-[306px] bg-white/15 rounded" />
                <div className="h-6 w-[105px] bg-white/15 rounded" />
                <div className="h-6 w-11 bg-white/15 rounded" />
              </div>
              <div className="flex h-6 items-center gap-2">
                <div className="h-6 w-20 bg-white/15 rounded" />
                <div className="h-6 w-[89px] bg-white/20 rounded" />
              </div>
            </div>

            {/* Right: free/not-enrolled card, the dominant production state. */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 animate-pulse lg:min-h-[643px]">
                <div className="h-48 bg-gray-200 rounded-lg mb-6" />
                <div className="h-8 w-10 bg-gray-200 rounded mb-6" />
                <div className="h-[52px] bg-gray-200 rounded-lg mb-4" />
                <div className="h-10 flex items-center justify-center gap-2 mb-6">
                  <div className="h-6 w-6 rounded-full bg-gray-200" />
                  <div className="h-5 w-24 rounded bg-gray-200" />
                </div>
                <div className="h-[189px] pt-6 border-t border-gray-200">
                  <div className="h-6 w-44 bg-gray-200 rounded mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-gray-200" />
                        <div className="h-4 flex-1 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content mirrors the real tabs/content/sidebar grid. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-[38px] w-full rounded-t-lg border-b border-gray-200 bg-white mb-8 flex items-center gap-8 px-4">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
            <div className="h-[154px] rounded-xl border border-gray-200 bg-white shadow-md p-8">
              <div className="h-9 w-56 rounded bg-gray-200 mb-6" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-3/4 rounded bg-gray-200" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="h-[142px] rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
              <div className="flex h-[92px] items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-7 w-48 rounded bg-gray-200" />
                  <div className="mt-2 flex h-14 flex-wrap content-start gap-4">
                    <div className="flex h-5 w-[95px] items-center gap-1.5">
                      <div className="h-4 w-4 rounded bg-gray-200" />
                      <div className="h-5 w-4 rounded bg-gray-200" />
                      <div className="h-4 flex-1 rounded bg-gray-200" />
                    </div>
                    <div className="flex h-5 w-[91px] items-center gap-1.5">
                      <div className="h-4 w-4 rounded bg-gray-200" />
                      <div className="h-5 w-4 rounded bg-gray-200" />
                      <div className="h-4 flex-1 rounded bg-gray-200" />
                    </div>
                    <div className="flex h-5 w-[113px] items-center gap-1.5">
                      <div className="h-4 w-4 rounded bg-gray-200" />
                      <div className="h-5 w-6 rounded bg-gray-200" />
                      <div className="h-4 flex-1 rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[126px] rounded-xl border border-gray-200 bg-white shadow-md p-6">
              <div className="h-7 w-32 rounded bg-gray-200 mb-1" />
              <div className="grid h-11 grid-cols-4 gap-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex h-11 items-center gap-2">
                    <div className="h-4 w-4 flex-shrink-0 rounded bg-gray-200" />
                    <div className="flex h-11 min-w-0 flex-1 flex-col justify-center gap-1">
                      <div className="h-4 w-2/5 rounded bg-gray-200" />
                      <div className="h-4 w-full rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailSkeleton;
