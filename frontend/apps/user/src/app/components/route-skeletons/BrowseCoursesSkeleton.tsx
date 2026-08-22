import React from "react";
import { CourseGridSkeleton } from "../course-module/CourseGridSkeleton";

interface BrowseCoursesSkeletonProps {
  activeFilterGroupCount?: number;
}

const Pulse: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse motion-reduce:animate-none ${className}`} />
);

const FilterRows: React.FC<{ count: number }> = ({ count }) => (
  <div className="mt-3 space-y-3">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex items-center gap-3 px-3">
        <Pulse className="h-4 w-4 rounded bg-gray-200" />
        <Pulse className={`h-4 rounded bg-gray-200 ${index % 2 === 0 ? "w-28" : "w-20"}`} />
      </div>
    ))}
  </div>
);

export const BrowseCoursesSkeleton: React.FC<BrowseCoursesSkeletonProps> = ({
  activeFilterGroupCount = 0,
}) => (
  <div
    className="min-h-screen bg-gray-50"
    role="status"
    aria-busy="true"
    aria-label="Loading courses"
  >
    <div aria-hidden="true">
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <Pulse className="mx-auto mb-6 h-[34px] w-48 rounded-full bg-white/15" />
            <Pulse className="mx-auto mb-4 h-10 w-72 max-w-full rounded-lg bg-white/25 md:h-12 md:w-96" />
            <div className="mx-auto max-w-2xl space-y-0.5">
              <Pulse className="h-7 w-full rounded bg-white/15" />
              <Pulse className="mx-auto h-7 w-3/4 rounded bg-white/15 md:hidden" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/25 bg-white/10 p-1.5 shadow-xl backdrop-blur-md">
            <Pulse className="h-[52px] rounded-[0.8rem] bg-white" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        {activeFilterGroupCount > 0 && (
          <div data-testid="browse-active-filter-skeletons" className="mb-4 flex flex-wrap gap-2">
            {Array.from({ length: activeFilterGroupCount }, (_, index) => (
              <Pulse
                key={index}
                className={`h-8 rounded-full bg-gray-200 ${index % 2 === 0 ? "w-28" : "w-36"}`}
              />
            ))}
          </div>
        )}

        <div data-testid="browse-mobile-filter-skeleton" className="mb-4 lg:hidden">
          <Pulse className="h-[42px] w-[102px] rounded-lg border border-gray-300 bg-white" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside data-testid="browse-desktop-sidebar-skeleton" className="hidden w-64 flex-shrink-0 lg:block">
            <div className="min-h-[813px] space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-1">
                <Pulse className="h-5 w-5 rounded bg-gray-200" />
                <Pulse className="h-6 w-20 rounded bg-gray-200" />
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex h-10 items-center justify-between">
                  <Pulse className="h-5 w-24 rounded bg-gray-200" />
                  <Pulse className="h-4 w-4 rounded bg-gray-200" />
                </div>
                <div className="mt-3" data-testid="browse-category-search-skeleton">
                  <Pulse className="h-[38px] w-full rounded-lg border border-gray-200 bg-white" />
                </div>
                <div className="mt-3 space-y-1">
                  {Array.from({ length: 2 }, (_, index) => (
                    <div key={index} className="flex h-9 items-center gap-3 px-3">
                      <Pulse className="h-4 w-4 rounded bg-gray-200" />
                      <Pulse className={`h-4 rounded bg-gray-200 ${index === 0 ? "w-24" : "w-20"}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex h-9 items-center justify-between">
                  <Pulse className="h-5 w-16 rounded bg-gray-200" />
                  <Pulse className="h-4 w-4 rounded bg-gray-200" />
                </div>
                <FilterRows count={3} />
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex h-9 items-center justify-between">
                  <Pulse className="h-5 w-28 rounded bg-gray-200" />
                  <Pulse className="h-4 w-4 rounded bg-gray-200" />
                </div>
                <FilterRows count={1} />
                <div className="mt-5 px-1">
                  <Pulse className="h-2 w-full rounded-full bg-gray-200" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <Pulse className="mb-1 h-3 w-12 rounded bg-gray-200" />
                      <Pulse className="h-10 w-full rounded-lg border border-gray-200 bg-white" />
                    </div>
                    <div>
                      <Pulse className="mb-1 h-3 w-14 rounded bg-gray-200" />
                      <Pulse className="h-10 w-full rounded-lg border border-gray-200 bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex h-9 items-center justify-between">
                <Pulse className="h-5 w-16 rounded bg-gray-200" />
                <Pulse className="h-4 w-4 rounded bg-gray-200" />
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div data-testid="browse-results-header-skeleton" className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Pulse className="h-6 w-36 rounded bg-gray-200" />
              <div className="flex items-center gap-2">
                <Pulse className="h-5 w-14 rounded bg-gray-200" />
                <Pulse className="h-[39px] w-48 rounded-lg border border-gray-300 bg-white" />
              </div>
            </div>
            <CourseGridSkeleton count={12} columns={3} />
          </section>
        </div>
      </div>
    </div>
  </div>
);

export default BrowseCoursesSkeleton;
