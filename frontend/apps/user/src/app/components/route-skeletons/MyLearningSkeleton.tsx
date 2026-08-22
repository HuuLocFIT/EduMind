import React from "react";
import { MyLearningEnrollmentCardSkeleton } from "./MyLearningEnrollmentCardSkeleton";

/**
 * MyLearningSkeleton mirrors the real My Learning layout 1:1 for zero-flash,
 * zero-layout-shift loading. Structure, top-to-bottom:
 *   1. Blue hero — welcome + quick-action card on the left, 2x2 stats grid on
 *      the right (mirrors HeroSection + StatsGrid)
 *   2. <main py-10> with a two-column flex region:
 *      - Main column (flex-1): CourseFilters header (title + tab pills) then a
 *        vertical space-y-4 list of tall enrollment cards (MyLearningEnrollmentCard)
 *      - Sidebar (lg:w-80): Progress / Motivation / Quick-Tips / Explore cards
 *          (mirrors LearningSidebar)
 * Kept in sync with pages/learning/MyLearningPage.tsx and
 * pages/learning/components/*.
 */
export const MyLearningSkeleton: React.FC = () => {
  return (
    <div
      className="min-h-screen bg-slate-50"
      role="status"
      aria-busy="true"
      aria-label="Loading My Learning"
    >
      <div aria-hidden="true">
        {/* Hero Section — mirrors HeroSection */}
        <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              {/* Welcome Message */}
              <div className="flex-1">
                {/* Badge pill */}
                <div className="h-8 w-56 bg-white/15 rounded-full mb-4" />
                {/* Greeting (h1 text-3xl md:text-4xl) */}
                <div className="h-9 md:h-10 w-64 md:w-80 bg-white/25 rounded-lg mb-3" />
                {/* Subtitle paragraph */}
                <div className="h-6 w-full max-w-md bg-white/15 rounded mb-6" />

                {/* Quick-action "Jump back in" card */}
                <div className="min-h-[194px] max-w-lg rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:min-h-[138px]">
                  <div className="h-4 w-24 bg-white/20 rounded mb-3" />
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:flex sm:gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 w-3/4 bg-white/20 rounded" />
                      <div className="h-4 w-1/2 bg-white/15 rounded" />
                    </div>
                    <div className="col-span-2 h-11 w-full rounded-xl bg-white/25 sm:h-10 sm:w-24 sm:flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Stats Grid — mirrors StatsGrid (grid grid-cols-2 gap-4, 4 cards) */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center"
                  >
                    <div className="w-14 h-14 bg-white/20 rounded-xl mx-auto mb-3" />
                    <div className="h-10 w-16 bg-white/20 rounded-lg mx-auto mb-1" />
                    <div className="h-4 w-20 bg-white/15 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content — mirrors <main className="... py-10"> */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Two-column region — flex (mirrors MyLearningPage:203) */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Column — Filters + Course List */}
            <div className="flex-1">
              {/* Filters — mirrors CourseFilters (title + tab pills, mb-6) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-8 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200">
                  <div className="h-9 w-20 bg-slate-200 rounded-lg" />
                  <div className="h-9 w-24 bg-slate-200 rounded-lg" />
                  <div className="h-9 w-28 bg-slate-200 rounded-lg" />
                </div>
              </div>

              {/* Course List — vertical space-y-4 tall enrollment cards */}
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 4 }, (_, i) => (
                  <MyLearningEnrollmentCardSkeleton key={i} />
                ))}
              </div>
            </div>

            {/* Sidebar — mirrors LearningSidebar (aside lg:w-80 space-y-6) */}
            <aside className="lg:w-80 space-y-6 animate-pulse">
              {/* Your Progress */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-24 h-24 rounded-full border-8 border-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-4 w-8 bg-slate-200 rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-8 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>

              {/* Motivation Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-white/25 rounded" />
                    <div className="h-3 w-24 bg-white/20 rounded" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-white/20 rounded" />
                  <div className="h-4 w-3/4 bg-white/20 rounded" />
                </div>
                <div className="h-12 w-full bg-white/25 rounded-xl" />
              </div>

              {/* Quick Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-20 bg-amber-200/60 rounded" />
                    <div className="h-3 w-full bg-amber-200/40 rounded" />
                    <div className="h-3 w-3/4 bg-amber-200/40 rounded" />
                  </div>
                </div>
              </div>

              {/* Explore More */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-slate-200 rounded" />
                  <div className="h-4 w-2/3 bg-slate-200 rounded" />
                </div>
                <div className="h-12 w-full bg-slate-200 rounded-xl" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyLearningSkeleton;
