import React from "react";
import type { CourseDetailResponse } from "@edumind/shared-types";
import { CourseStatusBadge } from "../CourseStatusBadge";
import { CourseDescriptionViewer } from "../../../course-module/CourseDescriptionViewer";
import { Users, Star, FileText, Clock, BookOpen } from "lucide-react";

interface OverviewTabProps {
  course: CourseDetailResponse;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ course }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Students</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.totalStudents ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-sm">Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.averageRating?.toFixed(1) ?? "0"}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Lessons</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.totalLessons ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Duration</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.durationHours ?? 0}h
          </p>
        </div>
      </div>

      {/* Course Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
            <CourseDescriptionViewer description={course.description} />
          </div>

          {/* Short Description */}
          {course.shortDescription && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Short Description
              </h3>
              <p className="text-gray-600">{course.shortDescription}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-gray-300" />
              </div>
            )}
          </div>

          {/* Course Details */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <CourseStatusBadge status={course.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category</span>
              <span className="font-medium">{course.category?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Level</span>
              <span className="font-medium">{course.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Language</span>
              <span className="font-medium">{course.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price</span>
              <span className="font-medium">
                {course.price === 0
                  ? "Free"
                  : `${course.currency} ${course.effectivePrice ?? course.price}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Certificate</span>
              <span className="font-medium">
                {course.hasCertificate ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

