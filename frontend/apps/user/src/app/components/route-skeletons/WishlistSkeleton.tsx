import React from "react";

/**
 * Loading skeleton for WishlistPage. Mirrors the real DOM 1:1 to avoid
 * layout shift / flash on load:
 *  - Root: min-h-screen bg-gray-50 (no extra padding)
 *  - Gradient hero band (blue-600 → indigo-800, py-8 md:py-16) with an
 *    icon tile + title/subtitle on the left and a "Clear All" button on the right
 *  - Content: max-w-7xl px py-8, grid lg:grid-cols-3 gap-8
 *    - lg:col-span-2 space-y-4: horizontal WishlistCard rows
 *    - lg:col-span-1: sticky summary Card
 */
export const WishlistSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header (mirrors real gradient hero) */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
            <div className="flex items-center gap-4">
              {/* Icon tile */}
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                <div className="w-8 h-8 bg-white/25 rounded" />
              </div>
              <div>
                {/* Title (text-2xl md:text-4xl) */}
                <div className="h-8 md:h-10 w-48 md:w-64 bg-white/25 rounded-lg mb-1 md:mb-2" />
                {/* Subtitle count (text-sm md:text-lg) */}
                <div className="h-4 md:h-5 w-40 md:w-56 bg-white/15 rounded" />
              </div>
            </div>

            {/* Clear All button */}
            <div className="h-10 w-full md:w-32 bg-white/10 border border-white/20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Course List */}
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden animate-pulse"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail (w-full md:w-72, h-48 md:aspect-video) */}
                  <div className="w-full md:w-72 h-48 md:h-auto md:aspect-video bg-gray-200 flex-shrink-0" />

                  {/* Content Info */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      {/* Title (2 lines, text-xl) + instructor */}
                      <div className="pr-10">
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-1" />
                        <div className="h-6 w-1/2 bg-gray-200 rounded mb-2" />
                        <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
                      </div>

                      {/* Rating row */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="h-4 w-28 bg-gray-200 rounded" />
                        <div className="h-4 w-20 bg-gray-200 rounded border-l border-gray-300 pl-4" />
                      </div>

                      {/* Price (PriceTag lg) */}
                      <div className="mb-4">
                        <div className="h-7 w-28 bg-gray-200 rounded" />
                      </div>
                    </div>

                    {/* Footer: added date + action buttons */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 border-t border-gray-100 mt-auto">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2 md:mb-0" />
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-28 bg-gray-200 rounded-lg flex-1 md:flex-none" />
                        <div className="h-10 w-32 bg-gray-200 rounded-lg flex-1 md:flex-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 sticky top-8 animate-pulse">
              {/* Title */}
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />

              <div className="space-y-3 mb-6">
                {/* Total Courses */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-8 bg-gray-200 rounded" />
                </div>
                {/* Free Courses */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-8 bg-gray-200 rounded" />
                </div>
                {/* Total Value */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                    <div className="h-6 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {/* Tip paragraph (2 lines) */}
                <div className="space-y-2 mb-3">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded" />
                </div>
                {/* Continue Browsing button */}
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistSkeleton;
