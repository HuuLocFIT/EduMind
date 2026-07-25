import React from "react";

export const CertificatesSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50" aria-hidden="true">
      {/* Header — mirrors CertificatesPage.tsx:54-72 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <div className="w-8 h-8 bg-white/25 rounded" />
            </div>
            <div>
              <div className="h-9 md:h-10 w-56 bg-white/25 rounded-lg mb-2" />
              <div className="h-6 w-44 bg-white/15 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content — mirrors CertificatesPage.tsx:75,98 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Certificate preview (h-48 gradient in real card) */}
              <div className="relative h-48 bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col items-center justify-center gap-3 p-4">
                <div className="w-16 h-16 bg-white/25 rounded" />
                <div className="h-5 w-3/4 bg-white/25 rounded" />
                {/* Watermark */}
                <div className="absolute top-2 right-2 h-6 w-20 bg-white/20 rounded" />
              </div>

              {/* Info */}
              <div className="p-5">
                {/* Date row */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                </div>
                {/* Actions */}
                <div className="flex gap-2">
                  <div className="h-9 flex-1 bg-gray-200 rounded-lg" />
                  <div className="h-9 w-10 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CertificatesSkeleton;
