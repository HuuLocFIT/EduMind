import React from "react";

export const CertificateVerifySkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12" aria-hidden="true">
      <div className="w-full max-w-2xl animate-pulse">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-10">
            <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="h-8 bg-white/20 rounded-lg w-64 mx-auto mb-2" />
            <div className="h-4 bg-white/20 rounded w-40 mx-auto" />
          </div>
          <div className="px-8 py-8 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="border-t border-gray-100" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};