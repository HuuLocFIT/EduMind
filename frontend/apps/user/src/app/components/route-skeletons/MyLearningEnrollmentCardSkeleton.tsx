import React from "react";

/** Mirrors the responsive structure of MyLearningEnrollmentCard. */
export const MyLearningEnrollmentCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
  >
    <div className="flex flex-col md:flex-row">
      <div className="relative aspect-video w-full flex-shrink-0 bg-slate-200 md:aspect-auto md:w-56">
        <div className="absolute left-3 top-3 h-7 w-24 rounded-full bg-slate-300" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2 sm:pr-4">
            <div className="h-6 w-3/4 rounded bg-slate-200" />
            <div className="hidden h-5 w-1/2 rounded bg-slate-200 md:block" />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="h-5 w-24 rounded bg-slate-200" />
              <div className="h-5 w-32 rounded bg-slate-200" />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-baseline justify-between gap-2 sm:block sm:text-right">
            <div className="h-4 w-16 rounded bg-slate-200 sm:hidden" />
            <div className="h-8 w-24 rounded bg-slate-200 sm:ml-auto sm:h-9" />
          </div>
        </div>

        <div className="mb-4 md:flex-1">
          <div className="h-3 w-full rounded-full bg-slate-200" />
          <div className="mt-2 h-5 w-44 rounded bg-slate-200" />
        </div>

        <div className="flex min-w-0 flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <div className="min-h-11 rounded-xl bg-slate-200 sm:w-20" />
            <div className="min-h-11 rounded-xl bg-slate-200 sm:w-28" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default MyLearningEnrollmentCardSkeleton;
