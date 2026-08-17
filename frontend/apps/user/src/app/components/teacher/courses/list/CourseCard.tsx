import React, { useState } from "react";
import { CourseStatus } from "@edumind/shared-constants";
import type { CourseResponse } from "@edumind/shared-types";
import { CourseStatusBadge } from "../CourseStatusBadge";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Star,
  Clock,
  Send,
} from "lucide-react";
import type { ViewMode } from "./types";
import { CloudinaryImage } from "@edumind/user-ui";

interface CourseCardProps {
  course: CourseResponse;
  viewMode: ViewMode;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onPublish,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const canPublish = course.status === CourseStatus.DRAFT;
  const canDelete = course.status !== CourseStatus.PUBLISHED;

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          <CloudinaryImage
            src={course.thumbnailUrl}
            alt={course.title}
            widths={[160]}
            className="w-full h-full object-cover"
          />
          {!course.thumbnailUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <CourseStatusBadge status={course.status} />
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course.totalStudents ?? 0}
            </span>
            {course.averageRating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {course.averageRating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">{`${course.durationHours ?? 0} hours`}</span>
              <span aria-hidden="true">{course.durationHours ?? 0}h</span>
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          {course.price === 0 ? (
            <span className="text-green-600 font-medium">Free</span>
          ) : (
            <span className="font-medium">
              {course.currency} {course.effectivePrice ?? course.price}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {menuOpen && (
            <>
              <div
                role="button"
                tabIndex={0}
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMenuOpen(false);
                  }
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-20">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onView();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" /> Edit Course
                </button>
                {canPublish && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPublish();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                  >
                    <Send className="w-4 h-4" /> Publish
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        <CloudinaryImage
          src={course.thumbnailUrl}
          alt={course.title}
          widths={[480, 960]}
          sizes="(max-width: 640px) calc(100vw - 2rem), calc(50vw - 2rem)"
          className="w-full h-full object-cover"
        />
        {!course.thumbnailUrl && (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <CourseStatusBadge status={course.status} />
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onView}
            className="p-2 bg-white rounded-lg hover:bg-gray-100"
            title="View"
          >
            <Eye className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-white rounded-lg hover:bg-gray-100"
            title="Edit"
          >
            <Edit className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
          {course.title}
        </h3>

        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.totalStudents ?? 0}
          </span>
          {course.averageRating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {course.averageRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{`${course.durationHours ?? 0} hours`}</span>
            <span aria-hidden="true">{course.durationHours ?? 0}h</span>
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          {course.price === 0 ? (
            <span className="text-green-600 font-semibold">Free</span>
          ) : (
            <div>
              {course.discountPrice && course.discountPrice < course.price ? (
                <>
                  <span className="text-gray-400 line-through text-sm">
                    {course.currency} {course.price}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {course.currency} {course.discountPrice}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-gray-900">
                  {course.currency} {course.price}
                </span>
              )}
            </div>
          )}

          <div className="relative z-50">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {menuOpen && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMenuOpen(false);
                    }
                  }}
                />
                <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onView();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Edit Course
                  </button>
                  {canPublish && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onPublish();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Send className="w-4 h-4" /> Publish
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

