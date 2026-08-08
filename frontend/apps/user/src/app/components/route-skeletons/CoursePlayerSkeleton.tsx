import React from "react";
import { useLessonTypeHint } from "../../hooks/useLessonTypeHint";
import { LessonContentSkeleton } from "./LessonContentSkeleton";

export interface CoursePlayerSkeletonProps {
  contentType?: "VIDEO" | "ARTICLE" | "QUIZ";
}

export const CoursePlayerSkeleton: React.FC<CoursePlayerSkeletonProps> = ({
  contentType,
}) => {
  const effectiveContentType = useLessonTypeHint(contentType);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        effectiveContentType === "VIDEO" ? "bg-gray-900" : "bg-white"
      }`}
      aria-busy="true"
    >
      <p role="status" className="sr-only">
        Loading course player
      </p>
      <div aria-hidden="true" className="flex flex-col flex-1">
      {/* Header — matches CoursePlayerHeader.tsx: one sticky dark header, one grid row */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-16 z-20">
        <div className="px-3 sm:px-4 py-3 grid grid-cols-[3rem_1fr_3rem] xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:gap-4 animate-pulse">
          {/* Exit button */}
          <div className="h-12 w-12 xl:h-10 xl:w-24 bg-gray-700 rounded-lg" />
          {/* Course title */}
          <div className="h-5 xl:h-6 w-40 xl:w-64 bg-gray-700 rounded mx-auto xl:mx-0" />
          {/* Mobile sidebar toggle (hidden at xl) */}
          <div className="h-12 w-12 xl:hidden bg-gray-700 rounded-lg" />
          {/* Progress (xl only) */}
          <div className="hidden xl:flex items-center gap-3">
            <div className="h-4 w-40 bg-gray-700 rounded" />
            <div className="w-32">
              <div className="h-1.5 w-full bg-gray-700 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex relative flex-1">
        <div className="flex-1 min-w-0 xl:mr-80 flex flex-col">
          <LessonContentSkeleton contentType={effectiveContentType} />

          <div className="flex-1" aria-hidden="true" />

          <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 grid grid-cols-2 gap-3 sm:gap-4 animate-pulse">
              <div className="justify-self-start w-32 sm:w-44 md:w-52 h-11 sm:h-12 bg-gray-200 rounded-lg" />
              <div className="justify-self-end w-32 sm:w-44 md:w-52 h-11 sm:h-12 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className="hidden xl:block fixed right-0 w-80 h-full bg-white border-l border-gray-200 z-40"
          style={{ top: "57px" }}
        >
          <div className="h-full overflow-hidden pb-20">
            {/* "Course Content" header */}
            <div className="p-4 border-b bg-gray-50 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-44 bg-gray-200 rounded mt-2" />
            </div>

            {/* Section list — sections start expanded */}
            <div className="p-2 space-y-4 animate-pulse">
              {Array.from({ length: 3 }, (_, s) => (
                <div
                  key={s}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Section header */}
                  <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                      <div className="h-2.5 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </div>

                  {/* Expanded lessons */}
                  <div className="mt-1 px-1 pb-2 pt-1">
                    {Array.from({ length: 3 }, (_, l) => (
                      <div
                        key={l}
                        className="p-3 rounded-lg mb-1 border-2 border-transparent"
                      >
                        <div className="flex items-start gap-3">
                          {/* Lesson number/status circle */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200" />
                          {/* Lesson info */}
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-3 w-16 bg-gray-200 rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
};

export default CoursePlayerSkeleton;
