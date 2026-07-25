import React from "react";
import { useSearchParams } from "react-router-dom";
import { TABS, type TabId } from "../../teacher/courses/detail";

export const TeacherCourseDetailSkeleton: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";

  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Header — Back button, Course title + Status badge, Action buttons (Publish, Edit) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-gray-200 rounded-lg" />
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Navigation Tabs — Overview, Curriculum, Students, Reviews */}
      <div className="border-b">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
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
                  className={`h-5 w-20 rounded ${
                    isActive ? "bg-green-600/30" : "bg-gray-200"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Content (Overview) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Stat cards grid (grid-cols-2 md:grid-cols-4 gap-4) cho Students, Rating, Lessons, Duration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-8 w-12 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Layout 2 cột (grid-cols-1 lg:grid-cols-3 gap-6) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái (lg:col-span-2): Khung Description & Short Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Card */}
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="h-5 w-28 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-4/5 bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>

              {/* Short Description Card */}
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="h-5 w-36 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
            </div>

            {/* Cột phải (Sidebar): Khung Thumbnail (aspect-video), Khung thông tin chi tiết */}
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="w-full aspect-video bg-gray-200" />
              </div>

              {/* Course Details (Status, Category, Level, Language, Price, Certificate) */}
              <div className="bg-white rounded-lg border p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content (Curriculum) */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-9 w-32 bg-gray-200 rounded-lg" />
          </div>

          {/* 3 Section accordion cards */}
          <div className="space-y-4">
            {[1, 2, 3].map((section) => (
              <div key={section} className="bg-white rounded-lg border overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded" />
                    <div className="space-y-1">
                      <div className="h-4 w-44 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
                {/* Lessons */}
                <div className="border-t divide-y">
                  {[1, 2, 3].map((lesson) => (
                    <div key={lesson} className="flex items-center gap-3 px-4 py-3 pl-12">
                      <div className="w-4 h-4 bg-gray-200 rounded" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-48 bg-gray-200 rounded" />
                        <div className="h-3 w-12 bg-gray-200 rounded" />
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

      {/* Tab Content (Students) */}
      {activeTab === "students" && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4 w-1/3 max-w-xs">
                <div className="h-3 w-10 bg-gray-200 rounded" />
                <div className="h-2 flex-1 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content (Reviews) */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div>
                    <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="w-3.5 h-3.5 bg-gray-200 rounded" />
                        ))}
                      </div>
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCourseDetailSkeleton;

