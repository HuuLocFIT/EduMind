import React from "react";

export const CartSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header Gradient Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative background blur circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-center justify-between gap-2 animate-pulse">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                <div className="w-8 h-8 rounded bg-white/20" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="h-7 md:h-9 w-48 bg-white/25 rounded-lg" />
                <div className="h-4 w-32 bg-white/15 rounded" />
              </div>
            </div>

            <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg w-24 h-8 bg-white/20 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Order Summary Sidebar - Top on mobile, right on desktop */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm lg:sticky lg:top-8 animate-pulse space-y-4">
              <div className="h-6 w-36 bg-gray-200 rounded" />

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>

                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>

                <div className="pt-2 sm:pt-3 border-t flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-16 bg-gray-200 rounded" />
                    <div className="h-7 w-24 bg-gray-200 rounded-lg" />
                  </div>
                  <div className="h-3 w-8 bg-gray-200 rounded mt-1" />
                </div>
              </div>

              {/* Proceed to Checkout button */}
              <div className="h-12 w-full bg-blue-600/80 rounded-xl mt-4" />

              {/* Security Note box */}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="h-3.5 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Cart Items - Main Content Left */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex gap-4 items-start sm:items-center animate-pulse"
              >
                {/* Thumbnail */}
                <div className="w-24 h-16 sm:w-36 sm:h-24 bg-gray-200 rounded-lg flex-shrink-0" />

                {/* Info Details */}
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-1/3 bg-gray-200 rounded" />
                  <div className="h-3.5 w-1/2 bg-gray-200 rounded" />
                </div>

                {/* Right side: Price & Delete */}
                <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  <div className="h-6 w-20 bg-gray-200 rounded-lg" />
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}

            {/* Continue Shopping button outline skeleton */}
            <div className="hidden lg:block pt-4">
              <div className="h-9 w-40 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSkeleton;
