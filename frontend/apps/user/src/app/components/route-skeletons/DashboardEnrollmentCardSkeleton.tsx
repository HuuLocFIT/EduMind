import React from "react";

export const DashboardEnrollmentCardSkeleton: React.FC = () => (
  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-col sm:flex-row">
      <div className="h-40 flex-shrink-0 bg-slate-200 sm:h-auto sm:w-44" />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex-1">
          <div className="mb-2 h-6 w-3/4 rounded bg-slate-200" />
          <div className="mb-4 h-5 w-2/5 rounded bg-slate-200" />
          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <div className="h-5 w-16 rounded bg-slate-200" />
              <div className="h-5 w-10 rounded bg-slate-200" />
            </div>
            <div className="h-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <div className="h-10 w-28 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  </article>
);
