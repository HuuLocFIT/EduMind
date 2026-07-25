import React from "react";

export const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header — mirrors OrderDetailPage.tsx:167-219 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 animate-pulse">
            {/* Back Button */}
            <div className="w-9 h-9 sm:w-36 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0" />

            {/* Order Info */}
            <div className="flex-1 min-w-0 flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-7 sm:h-8 lg:h-9 w-56 bg-white/25 rounded-lg" />
                <div className="h-4 w-40 bg-white/15 rounded" />
              </div>
            </div>

            {/* Status Badge (Desktop) */}
            <div className="hidden sm:block px-4 py-2 rounded-full h-9 w-28 bg-white/20 backdrop-blur-md border border-white/30 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Content — mirrors OrderDetailPage.tsx:222-430 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="order-1 lg:order-2 lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Order Summary Card */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="h-5 sm:h-6 w-32 bg-gray-200 rounded" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="pt-3 border-t-2 border-gray-100 flex justify-between items-center">
                  <div className="h-5 sm:h-6 w-16 bg-gray-200 rounded" />
                  <div className="h-7 sm:h-8 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Payment Information Card */}
            <div className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="h-5 sm:h-6 w-44 bg-gray-200 rounded" />
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Order Items Card */}
            <div className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm bg-white animate-pulse space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-5 sm:h-6 w-36 bg-gray-200 rounded" />
                  <div className="h-3.5 w-32 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="w-full sm:w-20 sm:h-14 lg:w-24 lg:h-16 aspect-video sm:aspect-auto rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0 w-full sm:w-auto space-y-1.5">
                      <div className="h-4 sm:h-5 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3.5 w-1/3 bg-gray-200 rounded" />
                    </div>
                    <div className="h-5 sm:h-6 w-20 bg-gray-200 rounded ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailSkeleton;
