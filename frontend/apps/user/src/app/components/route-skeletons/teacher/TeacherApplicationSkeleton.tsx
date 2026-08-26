import React from "react";

export const TeacherApplicationSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" aria-hidden="true">
      <div className="max-w-4xl mx-auto animate-pulse">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-9 w-80 bg-gray-200 rounded-lg mx-auto mb-2" />
          <div className="h-5 w-96 bg-gray-200 rounded mx-auto" />
        </div>

        {/* Application Form Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">
          {/* Card Header */}
          <div>
            <div className="h-7 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-72 bg-gray-200 rounded mt-1.5" />
          </div>

          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <div className="h-6 w-48 bg-gray-200 rounded" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded mb-1.5" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded mb-1.5" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>
            </div>

            <div>
              <div className="h-4 w-16 bg-gray-200 rounded mb-1.5" />
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
            </div>

            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Section 2: Professional Background */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <div className="h-6 w-56 bg-gray-200 rounded" />

            <div>
              <div className="h-4 w-40 bg-gray-200 rounded mb-1.5" />
              <div className="h-10 w-full bg-gray-200 rounded-lg mb-1" />
              <div className="h-3 w-64 bg-gray-200 rounded" />
            </div>

            <div>
              <div className="h-4 w-36 bg-gray-200 rounded mb-1.5" />
              <div className="h-10 w-full bg-gray-200 rounded-lg mb-1" />
              <div className="h-3 w-56 bg-gray-200 rounded" />
            </div>

            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-24 w-full bg-gray-200 rounded-lg mb-1" />
              <div className="h-3 w-72 bg-gray-200 rounded" />
            </div>

            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-1.5" />
              <div className="h-20 w-full bg-gray-200 rounded-lg mb-1" />
              <div className="h-3 w-60 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Section 3: Motivation */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <div className="h-6 w-36 bg-gray-200 rounded" />

            <div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-1.5" />
              <div className="h-24 w-full bg-gray-200 rounded-lg mb-1" />
              <div className="h-3 w-80 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Section 4: Required Documents */}
          <div className="space-y-6 border-t border-gray-200 pt-6">
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-full max-w-lg bg-gray-200 rounded" />
            </div>

            {/* File Upload Box 1 */}
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
              <div className="h-28 w-full bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg" />
              <div className="h-3 w-64 bg-gray-200 rounded mt-1" />
            </div>

            {/* File Upload Box 2 */}
            <div>
              <div className="h-4 w-36 bg-gray-200 rounded mb-1.5" />
              <div className="h-28 w-full bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg" />
              <div className="h-3 w-80 bg-gray-200 rounded mt-1" />
            </div>

            {/* File Upload Box 3 */}
            <div>
              <div className="h-4 w-44 bg-gray-200 rounded mb-1.5" />
              <div className="h-28 w-full bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg" />
              <div className="h-3 w-80 bg-gray-200 rounded mt-1" />
            </div>

            {/* File Upload Box 4 */}
            <div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-1.5" />
              <div className="h-28 w-full bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg" />
              <div className="h-3 w-72 bg-gray-200 rounded mt-1" />
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <div className="h-10 w-24 bg-gray-200 rounded-lg" />
            <div className="h-10 w-44 bg-blue-600/80 rounded-lg" />
          </div>
        </div>

        {/* Info Notice Box */}
        <div className="mt-6 bg-blue-50/70 border border-blue-100 rounded-lg p-4 space-y-2">
          <div className="h-4 w-20 bg-blue-200/80 rounded" />
          <div className="h-4 w-full bg-blue-200/60 rounded" />
          <div className="h-4 w-3/4 bg-blue-200/60 rounded" />
        </div>
      </div>
    </div>
  );
};

export default TeacherApplicationSkeleton;
