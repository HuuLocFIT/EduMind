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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Back / category pills */}
          <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4 animate-pulse">
            <div className="h-9 w-36 bg-white/20 rounded-full" />
            <div className="h-9 w-28 bg-white/15 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: title / subtitle / meta */}
            <div className="lg:col-span-2 animate-pulse">
              <div className="space-y-3 mb-6">
                <div className="h-10 md:h-12 w-11/12 bg-white/25 rounded-lg" />
                <div className="h-10 md:h-12 w-2/3 bg-white/25 rounded-lg" />
              </div>
              <div className="space-y-2 mb-6">
                <div className="h-6 w-full bg-white/15 rounded" />
                <div className="h-6 w-4/5 bg-white/15 rounded" />
              </div>
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="h-5 w-32 bg-white/15 rounded" />
                <div className="h-5 w-24 bg-white/15 rounded" />
                <div className="h-5 w-20 bg-white/15 rounded" />
              </div>
              <div className="h-5 w-48 bg-white/15 rounded" />
            </div>

            {/* Right: purchase card (white, overflows hero like the real one) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-6" />
                <div className="h-8 w-1/2 bg-gray-200 rounded mb-6" />
                <div className="space-y-3 mb-4">
                  <div className="h-12 bg-gray-200 rounded-lg" />
                  <div className="h-12 bg-gray-200 rounded-lg" />
                </div>
                <div className="h-6 w-2/3 bg-gray-200 rounded mx-auto mb-6" />
                <div className="pt-6 border-t border-gray-100 space-y-3">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded" />
                  <div className="h-4 w-4/6 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content below the hero (left column) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:w-2/3 space-y-8 animate-pulse">
          {/* "What you'll learn" style block */}
          <div className="space-y-3">
            <div className="h-6 w-52 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-11/12 bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded" />
          </div>

          {/* Curriculum accordion rows */}
          <div className="space-y-3">
            <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 bg-white border border-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailSkeleton;
