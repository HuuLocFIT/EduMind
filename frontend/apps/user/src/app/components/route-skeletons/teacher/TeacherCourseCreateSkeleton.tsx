import React from "react";

export const TeacherCourseCreateSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="h-4 w-72 bg-gray-200 rounded mt-1.5" />
      </div>

      {/* Stepper Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {/* Step 1 - Active */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-green-600 bg-green-600/20" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-gray-200" />

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-gray-100" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-gray-200" />

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-gray-100" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-gray-200" />

          {/* Step 4 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-gray-100" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
          </div>
        </div>
      </div>

      {/* Form Content Card */}
      <div className="bg-white rounded-xl border p-6 mb-6 space-y-6">
        {/* Course Title */}
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* URL Slug */}
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Short Description */}
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
          <div className="h-24 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Full Description */}
        <div>
          <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
          <div className="h-48 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Category & Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-1" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>
        </div>

        {/* Language */}
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Navigation Buttons Footer */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        <div className="h-10 w-24 bg-green-200/80 rounded-lg" />
      </div>
    </div>
  );
};

export default TeacherCourseCreateSkeleton;
