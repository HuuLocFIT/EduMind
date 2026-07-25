import React from "react";

export const TeacherReviewsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-5 w-96 max-w-full bg-gray-200 rounded mt-1" />
      </div>

      {/* ReviewsStats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
              <div className="min-w-0">
                <div className="h-4 w-20 bg-gray-200 rounded mb-1.5" />
                <div className="h-7 w-14 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 w-44 bg-gray-200 rounded mb-4" />
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left bar chart */}
          <div className="flex-1 space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="h-4 w-10 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-100 rounded-full" />
                <div className="h-4 w-14 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          {/* Right overall score box */}
          <div className="flex flex-col items-center justify-center px-6 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0">
            <div className="h-9 w-12 bg-gray-200 rounded" />
            <div className="h-5 w-24 bg-gray-200 rounded mt-2" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-1" />
          </div>
        </div>
      </div>

      {/* ReviewsFilters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        {/* Top tabs row */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          <div className="h-9 w-20 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
        </div>
        {/* Bottom filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-16 bg-gray-200 rounded-lg" />
          <div className="h-8 w-32 bg-gray-200 rounded-lg" />
          <div className="h-8 w-28 bg-gray-200 rounded-lg" />
          <div className="flex-1" />
          <div className="h-8 w-28 bg-gray-200 rounded-lg" />
          <div className="h-8 w-8 bg-gray-200 rounded-lg" />
          <div className="h-8 w-8 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div>
                  <div className="h-5 w-48 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-36 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded flex-shrink-0" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <div className="h-9 w-20 rounded-md bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherReviewsSkeleton;

