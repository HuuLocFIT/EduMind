import React from "react";

export const SepayQrSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" aria-hidden="true">
      <div className="max-w-lg mx-auto animate-pulse">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100/70 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-200/80 rounded" />
          </div>
          <div className="h-7 w-60 bg-gray-200 rounded-lg mx-auto mb-2" />
          <div className="h-4 w-80 bg-gray-200 rounded mx-auto" />
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          {/* Timer */}
          <div className="h-6 w-48 bg-gray-200 rounded-lg mx-auto mb-4" />

          {/* QR Code Image Placeholder */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-6 flex justify-center">
            <div className="w-full max-w-[280px] aspect-square bg-gray-200 rounded-lg" />
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {/* Amount */}
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-6 w-28 bg-gray-200 rounded" />
            </div>

            {/* Order Number */}
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Status indicator */}
          <div className="h-4 w-56 bg-gray-200 rounded mx-auto mt-4" />
        </div>

        {/* Instructions Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 space-y-4">
          <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100/70 rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-blue-200/80 rounded-full" />
                </div>
                <div className="h-4 w-64 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Note Subtext */}
        <div className="h-3 w-80 bg-gray-200 rounded mx-auto mt-6" />
      </div>
    </div>
  );
};

export default SepayQrSkeleton;
