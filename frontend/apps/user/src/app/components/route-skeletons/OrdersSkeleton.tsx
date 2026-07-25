import React from "react";

export const OrdersSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-12" aria-hidden="true">
      {/* Header — mirrors OrdersPage.tsx:121-150 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                <div className="w-8 h-8 bg-white/25 rounded" />
              </div>
              <div>
                <div className="h-9 md:h-10 w-48 bg-white/25 rounded-lg mb-2" />
                <div className="h-5 w-64 bg-white/15 rounded" />
              </div>
            </div>
            <div className="h-9 w-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Content — mirrors OrdersPage.tsx:152-335 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 py-2 rounded-full h-9 w-28 bg-white border border-gray-200 flex-shrink-0"
            />
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
            >
              {/* Order Meta Header */}
              <div className="bg-gray-50/50 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-gray-100">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <span className="text-gray-300">|</span>
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded-full" />
              </div>

              {/* Order Content */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Course Thumbnail */}
                  <div className="w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32 flex-shrink-0 bg-gray-200 rounded-xl" />

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-0">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="h-6 w-3/4 bg-gray-200 rounded" />
                        <div className="h-7 w-24 bg-gray-200 rounded-lg flex-shrink-0 ml-auto" />
                      </div>
                      <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
                    </div>

                    <div className="pt-4 sm:pt-0">
                      <div className="h-9 w-28 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersSkeleton;
