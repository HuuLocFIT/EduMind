import React from 'react';

export const ProfileSettingsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded" />
            </div>
            <div>
              <div className="h-8 md:h-10 w-64 bg-white/25 rounded-lg mb-2" />
              <div className="h-4 md:h-5 w-80 bg-white/15 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Tabs */}
          <aside className="lg:col-span-1">
            <div className="p-4 space-y-2 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600/30 text-blue-600">
                <div className="w-5 h-5 rounded bg-blue-600/40" />
                <div className="h-5 w-20 bg-blue-600/40 rounded" />
              </div>
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 text-gray-400">
                <div className="w-5 h-5 rounded bg-gray-300" />
                <div className="h-5 w-24 bg-gray-300 rounded" />
              </div>
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 text-gray-400">
                <div className="w-5 h-5 rounded bg-gray-300" />
                <div className="h-5 w-20 bg-gray-300 rounded" />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="p-6 space-y-6 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
              <div className="h-7 w-56 bg-gray-200 rounded-lg mb-6" />

              {/* Avatar Section */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
                <div>
                  <div className="h-10 w-36 bg-gray-200 rounded-lg" />
                  <div className="h-3.5 w-48 bg-gray-200 rounded mt-2" />
                </div>
              </div>

              {/* Name Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg" />
                </div>
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg" />
                </div>
              </div>

              {/* Account Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg" />
                </div>
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg" />
                </div>
              </div>

              {/* Phone Number Field */}
              <div>
                <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <div className="h-10 w-36 bg-blue-600/80 rounded-lg" />
                <div className="h-10 w-20 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsSkeleton;
