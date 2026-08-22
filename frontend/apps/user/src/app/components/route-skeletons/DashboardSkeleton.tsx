import React from "react";
import { CourseGridSkeleton } from "../course-module/CourseGridSkeleton";
import { DashboardEnrollmentCardSkeleton } from "./DashboardEnrollmentCardSkeleton";

/**
 * DashboardSkeleton mirrors the real Dashboard layout 1:1 for zero-flash,
 * zero-layout-shift loading. Structure intentionally matches, top-to-bottom:
 *   1. Blue hero — welcome + quick-action card on the left, 2x2 stats grid on
 *      the right (mirrors DashboardHeroSection + DashboardStatsGrid)
 *   2. <main py-10> containing:
 *      - Two-column flex region: Continue Learning (flex-1) + Sidebar (lg:w-80)
 *      - Recommended courses grid (4-up)
 *      - Newest courses grid (4-up)
 * Kept in sync with pages/DashboardPage.tsx and pages/dashboard/components/*.
 */
interface DashboardSkeletonProps {
  showApplicationBanner?: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  showApplicationBanner = false,
}) => {
  return (
    <div
      className="min-h-screen bg-slate-50"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div aria-hidden="true">
        {/* Hero Section — mirrors DashboardHeroSection */}
        <section className="min-h-[854px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white sm:min-h-[770px] md:min-h-[774px] lg:min-h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse motion-reduce:animate-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              {/* Welcome Message */}
              <div className="flex-1">
                {/* Badge pill */}
                <div className="h-8 w-56 bg-white/15 rounded-full mb-4" />
                {/* Greeting (h1 text-3xl md:text-4xl) */}
                <div className="h-9 md:h-10 w-64 md:w-80 bg-white/25 rounded-lg mb-3" />
                {/* Subtitle wraps to two lines on mobile, like the real copy. */}
                <div className="mb-6 max-w-md space-y-2">
                  <div className="h-6 w-full rounded bg-white/15" />
                  <div className="h-6 w-3/4 rounded bg-white/15 sm:hidden" />
                </div>

                {/* Quick-action "Continue Learning" card */}
                <div className="h-[194px] max-w-lg rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:h-[138px]">
                  <div className="h-4 w-24 bg-white/20 rounded mb-3" />
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:flex sm:gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex-shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-3/4 rounded bg-white/20" />
                      <div className="h-4 w-40 max-w-full rounded bg-white/15 sm:w-1/2" />
                    </div>
                    <div className="col-span-2 h-11 w-full rounded-xl bg-white/25 sm:h-10 sm:w-24 sm:flex-shrink-0" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {showApplicationBanner && (
            <div
              data-testid="dashboard-application-banner-skeleton"
              className="mb-6 flex h-[176px] items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:h-[126px] sm:p-5 sm:pr-20 animate-pulse motion-reduce:animate-none"
            >
              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:hidden">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="flex min-h-10 items-center pr-10">
                    <div className="h-5 w-44 max-w-full rounded bg-slate-200" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <div className="h-4 w-full max-w-lg rounded bg-slate-200" />
                    <div className="h-3 w-32 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="hidden min-w-0 items-start gap-3 sm:flex">
                  <div className="h-12 w-12 flex-none rounded-xl bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-5 w-44 rounded bg-slate-200" />
                    <div className="h-4 w-full max-w-lg rounded bg-slate-200" />
                    <div className="h-3 w-32 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-10 w-32 flex-none self-center rounded-xl bg-slate-200 sm:self-auto" />
              </div>
            </div>
          )}

          {/* Two-column region — flex, NOT grid (mirrors DashboardPage:167) */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Column — Continue Learning */}
            <div className="flex-1 space-y-8">
              <div className="animate-pulse motion-reduce:animate-none">
                {/* Header: two-line title + subtitle + View All button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="h-8 w-56 bg-slate-200 rounded" />
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 rounded sm:h-10 sm:w-24 sm:rounded-xl" />
                </div>

                {/* 3 compact enrollment cards — mirror DashboardEnrollmentCard */}
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <DashboardEnrollmentCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar — mirrors DashboardSidebar (aside lg:w-80 space-y-6) */}
            <aside className="lg:w-80 space-y-6 animate-pulse motion-reduce:animate-none">
              {/* Quick Actions (4 rows) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="flex h-[62px] items-center gap-3 rounded-xl bg-slate-50 p-2.5"
                    >
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explore Categories */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 2 }, (_, i) => (
                    <div
                      key={i}
                      className="flex h-[62px] items-center gap-3 rounded-xl bg-slate-50 p-2.5"
                    >
                      <div className="h-10 w-10 flex-none rounded-lg bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                        <div className="h-3 w-2/5 rounded bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-4 w-36 rounded bg-slate-200" />
              </div>

              {/* Learning Tip */}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse motion-reduce:animate-none">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-slate-200 rounded" />
                <div className="h-4 w-48 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded sm:h-10 sm:w-28 sm:rounded-xl" />
            </div>
            <CourseGridSkeleton count={4} columns={4} />
          </div>

          {/* Newest Courses (mt-10) — mirrors NewestCoursesSection */}
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse motion-reduce:animate-none">
              <div className="space-y-2">
                <div className="h-8 w-52 bg-slate-200 rounded" />
                <div className="h-4 w-44 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded sm:h-10 sm:w-24 sm:rounded-xl" />
            </div>
            <CourseGridSkeleton count={4} columns={4} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
