import React from "react";

export const CertificateVerifySkeleton: React.FC = () => {
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center px-4 py-3 sm:py-12" aria-hidden="true">
      <div className="w-full max-w-2xl animate-pulse my-auto">
        {/* Status Badge */}
        <div className="text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-green-100/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-300 rounded-full" />
            <div className="h-3 sm:h-3.5 bg-green-300 rounded w-20 sm:w-28" />
          </div>
        </div>

        {/* Certificate Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 sm:px-8 py-4 sm:py-10">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white/20 rounded-full mx-auto mb-2 sm:mb-4" />
            <div className="h-5 sm:h-8 bg-white/20 rounded-lg w-48 sm:w-64 mx-auto mb-1 sm:mb-2" />
            <div className="h-3 sm:h-4 bg-white/20 rounded w-28 sm:w-40 mx-auto" />
          </div>
          <div className="px-5 sm:px-8 py-4 sm:py-8 space-y-3 sm:space-y-6">
            <div className="text-center">
              <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-12 sm:w-16 mx-auto mb-1" />
              <div className="h-5 sm:h-6 bg-gray-200 rounded w-36 sm:w-48 mx-auto" />
            </div>
            <div className="border-t border-gray-100" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-12 sm:w-16 mb-1" />
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32" />
                </div>
              </div>
            ))}
            {/* Reference */}
            <div className="border-t border-gray-100 pt-3 sm:pt-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded" />
                <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-36 sm:w-48" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-3 sm:mt-6">
          <span className="inline-block h-2 sm:h-3 bg-gray-200 rounded w-56 sm:w-80" />
        </p>
      </div>
    </div>
  );
};