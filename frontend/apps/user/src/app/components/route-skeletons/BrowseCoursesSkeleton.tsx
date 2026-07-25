import React from "react";
import { CourseGridSkeleton } from "../course-module/CourseGridSkeleton";

/**
 * Suspense fallback for the Browse Courses route.
 *
 * Mirrors the real page shell (blue hero + search, w-64 filter sidebar, and
 * the course grid) so that when BrowseCoursesPage mounts the layout does not
 * shift. The grid area reuses <CourseGridSkeleton /> — the exact same skeleton
 * the page shows while its data loads — so the chunk-load → data-load → content
 * sequence is a single seamless transition, not a flicker of three states.
 */
export const BrowseCoursesSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero (matches BrowseHeroSection) */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto flex flex-col items-center mb-8 animate-pulse">
            <div className="h-8 w-44 bg-white/20 rounded-full mb-6" />
            <div className="h-10 md:h-12 w-72 bg-white/25 rounded-lg mb-4" />
            <div className="h-5 w-full max-w-xl bg-white/15 rounded" />
          </div>
          {/* Search box */}
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white/10 p-2 rounded-2xl border border-white/20">
              <div className="bg-white rounded-xl h-[60px]" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filter sidebar (matches lg:w-64) */}
          <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 animate-pulse">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="border-b border-gray-200 py-4 space-y-3">
                <div className="h-5 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-4/5 bg-gray-200 rounded" />
                <div className="h-3 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
              </div>
            ))}
          </aside>

          {/* Main list area */}
          <main className="flex-1">
            {/* Sort / results row */}
            <div className="flex items-center justify-between mb-6 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-10 w-44 bg-gray-200 rounded-lg" />
            </div>
            <CourseGridSkeleton count={9} columns={3} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default BrowseCoursesSkeleton;
