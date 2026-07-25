import React from "react";
import { useSearchParams } from "react-router-dom";
import { TABS, type TabId } from "../../teacher/courses/edit";

export const TeacherCourseEditSkeleton: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "basic";

  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Header */}
      <div>
        <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-44 bg-gray-200 rounded-lg" />
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-64 bg-gray-200 rounded mt-1.5" />
      </div>

      {/* Form Card Wrapper */}
      <div className="bg-white rounded-xl border">
        {/* Navigation Tabs Header */}
        <div className="border-b px-4">
          <div className="flex gap-4 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-green-600 text-green-600 font-medium"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded ${
                      isActive ? "bg-green-600/40" : "bg-gray-200"
                    }`}
                  />
                  <div
                    className={`h-5 w-24 rounded ${
                      isActive ? "bg-green-600/30" : "bg-gray-200"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* basic tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (lg:col-span-2) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Title input */}
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Slug input */}
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Short Description textarea */}
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                    <div className="h-24 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Full Description rich text editor box */}
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-48 w-full bg-gray-200 rounded-lg" />
                  </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                  {/* Level select */}
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Language select */}
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Duration input */}
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  {/* Thumbnail upload dropzone box */}
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-40 w-full bg-gray-200 rounded-xl" />
                  </div>
                  {/* Preview Video URL input */}
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Footer Save Button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <div className="h-10 w-32 bg-green-200/80 rounded-lg" />
              </div>
            </div>
          )}

          {/* curriculum tab */}
          {activeTab === "curriculum" && (
            <div className="space-y-6">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
              </div>

              {/* 3 Section cards */}
              <div className="space-y-4">
                {[1, 2, 3].map((section) => (
                  <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden space-y-3 p-4">
                    {/* Section Header with Drag grip icon & section title */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-gray-200 rounded" />
                        <div className="h-5 w-44 bg-gray-200 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
                        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
                      </div>
                    </div>

                    {/* Lesson rows */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 pl-6">
                      {[1, 2].map((lesson) => (
                        <div key={lesson} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                          </div>
                          <div className="h-4 w-12 bg-gray-200 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* pricing tab */}
          {activeTab === "pricing" && (
            <div className="max-w-2xl space-y-6">
              {/* Switch Free Course card */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
                <div className="w-11 h-6 bg-gray-200 rounded-full" />
              </div>

              {/* Currency select */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>

              {/* Regular Price input */}
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>

              {/* Discount Price input */}
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>

              {/* Price preview box */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-36 bg-gray-200 rounded-lg" />
              </div>

              {/* Footer Save Button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <div className="h-10 w-32 bg-green-200/80 rounded-lg" />
              </div>
            </div>
          )}

          {/* settings tab */}
          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-8">
              {/* Section "Course Features" (2 switch cards) */}
              <div className="space-y-4">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-4 w-36 bg-gray-200 rounded" />
                        <div className="h-3 w-56 bg-gray-200 rounded" />
                      </div>
                      <div className="w-11 h-6 bg-gray-200 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section "SEO Settings" (Meta Title, Description, Keywords) */}
              <div className="space-y-4">
                <div className="h-5 w-28 bg-gray-200 rounded" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-20 w-full bg-gray-200 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Section "Search Preview" box */}
              <div className="space-y-3">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>

              {/* Footer Save Button */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <div className="h-10 w-32 bg-green-200/80 rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherCourseEditSkeleton;
