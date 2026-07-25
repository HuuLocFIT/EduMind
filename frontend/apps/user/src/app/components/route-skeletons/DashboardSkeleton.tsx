import React from "react";
import { CourseGridSkeleton } from "../course-module/CourseGridSkeleton";

/**
 * DashboardSkeleton mirrors the real Dashboard layout 1:1 for zero-flash,
 * zero-layout-shift loading. Structure intentionally matches, top-to-bottom:
 *   1. Blue hero — welcome + quick-action card on the left, 2x2 stats grid on
 *      the right (mirrors DashboardHeroSection + DashboardStatsGrid)
 *   2. <main py-10> containing:
 *      - Categories row: heading + horizontal pills (CategoriesSection)
 *      - Two-column flex region: Continue Learning (flex-1) + Sidebar (lg:w-80)
 *      - Recommended courses grid (4-up)
 *      - Newest courses grid (4-up)
 * Kept in sync with pages/DashboardPage.tsx and pages/dashboard/components/*.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50" aria-hidden="true">
      {/* Hero Section — mirrors DashboardHeroSection */}
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

              {/* Quick-action "Continue Learning" card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 max-w-lg">
                <div className="h-4 w-24 bg-white/20 rounded mb-3" />
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-3/4 bg-white/20 rounded" />
                    <div className="h-4 w-1/2 bg-white/15 rounded" />
                  </div>
                  <div className="h-10 w-24 bg-white/25 rounded-xl flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Stats Grid — mirrors DashboardStatsGrid (grid grid-cols-2 gap-4) */}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Categories row — mirrors CategoriesSection (mb-10) */}
        <div className="mb-10 animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
          <div className="flex gap-3 overflow-x-hidden pb-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-10 w-32 bg-white rounded-xl border border-slate-200 flex-shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Two-column region — flex, NOT grid (mirrors DashboardPage:167) */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Column — Continue Learning */}
          <div className="flex-1 space-y-8">
            <div className="animate-pulse">
              {/* Header: two-line title + subtitle + View All button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <div className="h-8 w-56 bg-slate-200 rounded" />
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                </div>
                <div className="h-10 w-24 bg-slate-200 rounded-xl" />
              </div>

              {/* 3 tall enrollment cards — mirror DashboardEnrollmentCard */}
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row"
                  >
                    {/* Thumbnail (md:w-56 h-44 md:aspect-video) */}
                    <div className="md:w-56 h-44 md:h-auto md:aspect-video bg-slate-200 flex-shrink-0" />
                    {/* Info */}
                    <div className="flex-1 p-5 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-4 space-y-2">
                          <div className="h-5 w-3/4 bg-slate-200 rounded" />
                          <div className="h-5 w-1/2 bg-slate-200 rounded" />
                          <div className="h-3 w-2/5 bg-slate-200 rounded" />
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="h-8 w-12 bg-slate-200 rounded" />
                          <div className="h-3 w-10 bg-slate-200 rounded ml-auto" />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mb-4 flex-1">
                        <div className="h-3 w-full bg-slate-200 rounded-full" />
                        <div className="h-3 w-32 bg-slate-200 rounded mt-2" />
                      </div>
                      {/* CTA row */}
                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <div className="h-9 w-16 bg-slate-200 rounded-lg" />
                        <div className="h-10 w-24 bg-slate-200 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — mirrors DashboardSidebar (aside lg:w-80 space-y-6) */}
          <aside className="lg:w-80 space-y-6 animate-pulse">
            {/* Learning Streak */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-28 bg-white/25 rounded" />
                  <div className="h-3 w-16 bg-white/20 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-white/20 rounded" />
            </div>

            {/* Quick Actions (4 rows) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="h-5 w-28 bg-slate-200 rounded mb-4" />
              <div className="h-4 w-40 bg-slate-200 rounded" />
            </div>

            {/* Pro Tip */}
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
          </aside>
        </div>

        {/* Recommended Courses — full width (mt-10) */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 rounded" />
              <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
            <div className="h-10 w-28 bg-slate-200 rounded-xl" />
          </div>
          <CourseGridSkeleton count={4} columns={4} />
        </div>

        {/* Newest Courses (mt-10) — mirrors NewestCoursesSection */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 w-52 bg-slate-200 rounded" />
              <div className="h-4 w-44 bg-slate-200 rounded" />
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl" />
          </div>
          <CourseGridSkeleton count={4} columns={4} />
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;
