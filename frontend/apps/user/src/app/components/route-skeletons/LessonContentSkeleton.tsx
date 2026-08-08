import React from "react";
import { Card } from "@edumind/user-ui";
import type { LessonTypeHint } from "../../hooks/useLessonTypeHint";

export interface LessonContentSkeletonProps {
  contentType?: LessonTypeHint;
}

export const LessonContentSkeleton: React.FC<LessonContentSkeletonProps> = ({
  contentType,
}) => {
  return (
    <>
      {/* Video area */}
      {contentType === "VIDEO" && (
        <div className="relative mx-auto w-full bg-black aspect-video max-h-[calc(100vh-180px)] xl:max-h-[calc(100vh-220px)] flex items-center justify-center">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Lesson content */}
      <div className="p-3 sm:p-6 pb-28 bg-white">
        <div className="max-w-4xl mx-auto animate-pulse">
          {/* Lesson header row */}
          {contentType === "QUIZ" ? (
            <div className="mb-6">
              <div className="h-8 w-2/3 bg-gray-200 rounded mb-1" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div className="flex-1 min-w-0">
                {/* h2 text-2xl title */}
                <div className="h-8 w-2/3 bg-gray-200 rounded mb-2" />
              </div>
              {/* Mark Complete button */}
              <div className="h-10 w-36 bg-gray-200 rounded-lg flex-shrink-0" />
            </div>
          )}

          {/* UNKNOWN / NEUTRAL TYPE: Neutral Card Shell (No Video assumption) */}
          {!contentType && (
            <Card className="p-4 sm:p-8 mb-6 space-y-4">
              <div className="h-6 w-3/4 bg-gray-200 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-4 w-4/6 bg-gray-200 rounded" />
              </div>
              <div className="h-40 w-full bg-gray-100 rounded-lg my-4" />
            </Card>
          )}

          {/* ARTICLE type */}
          {contentType === "ARTICLE" && (
            <Card className="p-4 sm:p-8 mb-6">
              {/* "Lesson Content" label row (ArticleViewer.tsx title prop) */}
              <div className="h-3 w-32 bg-gray-200 rounded mb-4 pb-2 border-b border-gray-100" />
              {/* 4 lines text skeleton */}
              <div className="space-y-2 mb-4">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-4 w-4/5 bg-gray-200 rounded" />
              </div>
              {/* Illustration image placeholder */}
              <div className="h-48 w-full bg-gray-200 rounded-lg my-4" />
              {/* 3 lines text skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            </Card>
          )}

          {/* VIDEO type */}
          {contentType === "VIDEO" && (
            <Card className="p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-56 bg-gray-200 rounded" />
                </div>
              </div>
            </Card>
          )}

          {/* QUIZ type */}
          {contentType === "QUIZ" && (
            <div className="space-y-6">
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="space-y-2">
                    <div className="h-11 bg-gray-100 rounded-md" />
                    <div className="h-11 bg-gray-100 rounded-md" />
                    <div className="h-11 bg-gray-100 rounded-md" />
                    <div className="h-11 bg-gray-100 rounded-md" />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="h-10 w-32 bg-gray-200 rounded-md" />
              </div>
            </div>
          )}

          {/* Take Quiz & AI Lesson Summary — VIDEO & ARTICLE types */}
          {contentType !== "QUIZ" && (
            <>
              <div className="mb-6">
                <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                <div className="h-3 w-40 bg-gray-100 rounded mt-1.5" />
              </div>

              {/* AI Lesson Summary panel */}
              <Card className="p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-indigo-50 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-3 w-56 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="h-14 bg-gray-100 rounded-md" />
                    <div className="h-14 bg-gray-100 rounded-md" />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LessonContentSkeleton;
