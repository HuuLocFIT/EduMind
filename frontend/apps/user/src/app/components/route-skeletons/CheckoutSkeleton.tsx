import React from "react";

export const CheckoutSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header — mirrors CheckoutPage.tsx:281-310 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3 animate-pulse">
            <div className="w-8 h-8 sm:w-20 sm:h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20" />
            <div className="flex-1 h-7 sm:h-8 w-32 bg-white/25 rounded-lg max-w-[150px]" />
            <div className="h-5 w-20 bg-white/15 rounded" />
          </div>
        </div>
      </div>

      {/* Content — mirrors CheckoutPage.tsx:313-502 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar (Order Summary) */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm lg:sticky lg:top-8 animate-pulse space-y-4">
              <div className="h-6 w-36 bg-gray-200 rounded" />
              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-12 bg-gray-200 rounded" />
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                  <div className="h-7 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="h-11 sm:h-12 w-full bg-gray-200 rounded-lg mt-4" />
              <div className="pt-2 space-y-2">
                <div className="h-3.5 w-28 bg-gray-200 rounded" />
                <div className="h-3.5 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Main Content (Payment & Items) */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Payment Method Card */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3 sm:p-4 rounded-lg border-2 border-gray-200 flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-40 bg-gray-200 rounded" />
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items Card */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm animate-pulse">
              <div className="h-6 w-36 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-9 sm:w-16 sm:h-12 rounded bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-44 bg-gray-200 rounded" />
                      <div className="h-3 w-28 bg-gray-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded ml-auto flex-shrink-0" />
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

export default CheckoutSkeleton;
