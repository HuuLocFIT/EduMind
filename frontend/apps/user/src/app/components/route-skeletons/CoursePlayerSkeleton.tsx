import React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Card } from "@edumind/user-ui";

export interface CoursePlayerSkeletonProps {
  contentType?: "VIDEO" | "ARTICLE" | "QUIZ";
}

/**
 * Loading skeleton for CoursePlayerPage.
 *
 * Mirrors the real rendered structure (CoursePlayerPage.tsx):
 * - Root: bg-gray-900 (shows through gaps)
 * - Dark sticky header (bg-gray-800, sticky top-16) with mobile + xl variants
 * - Main column: VIDEO / ARTICLE / QUIZ layout variants
 * - Right sidebar: white w-80 fixed panel (xl only), sections expanded by default
 */
export const CoursePlayerSkeleton: React.FC<CoursePlayerSkeletonProps> = ({
  contentType,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const parseValidType = (val?: string | null): "VIDEO" | "ARTICLE" | "QUIZ" | undefined => {
    if (!val) return undefined;
    const upper = val.toUpperCase();
    if (upper === "VIDEO" || upper === "ARTICLE" || upper === "QUIZ") {
      return upper as "VIDEO" | "ARTICLE" | "QUIZ";
    }
    return undefined;
  };

  const typeFromProp = parseValidType(contentType);
  const typeFromParam = parseValidType(searchParams.get("type"));

  let typeFromStorage: "VIDEO" | "ARTICLE" | "QUIZ" | undefined;
  try {
    const lessonId = searchParams.get("lesson") || searchParams.get("lessonId");
    if (lessonId) {
      typeFromStorage = parseValidType(localStorage.getItem(`lesson_${lessonId}_type`));
    }
    if (!typeFromStorage) {
      const pathname = location.pathname || (typeof window !== "undefined" ? window.location.pathname : "");
      const match = pathname.match(/courses\/(\d+)/);
      if (match && match[1]) {
        typeFromStorage = parseValidType(localStorage.getItem(`course_${match[1]}_last_lesson_type`));
      }
    }
  } catch {
    // Ignore storage access errors
  }

  // If explicit contentType/type is provided/found, use it. Otherwise, use undefined for Generic Neutral Shell.
  const effectiveContentType = typeFromProp ?? typeFromParam ?? typeFromStorage;

  return (
    <div className="min-h-screen bg-gray-900" aria-hidden="true">
      {/* Header — matches sticky dark header (real: line 685) */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-16 z-20">
        {/* Mobile / tablet header (real: line 686, xl:hidden) */}
        <div className="px-3 sm:px-4 py-3 xl:hidden">
          <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 animate-pulse">
            <div className="h-12 w-12 bg-gray-700 rounded-lg" />
            <div className="h-5 w-40 bg-gray-700 rounded mx-auto" />
            <div className="h-12 w-12 bg-gray-700 rounded-lg" />
          </div>
        </div>

        {/* Desktop header (real: line 712, hidden xl:flex) */}
        <div className="hidden xl:flex px-4 py-3 items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4 min-w-0">
            {/* Exit button */}
            <div className="h-10 w-24 bg-gray-700 rounded-lg" />
            {/* Course title */}
            <div className="h-6 w-64 bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-3">
            {/* "Course Progress: N%" text */}
            <div className="h-4 w-40 bg-gray-700 rounded" />
            {/* ProgressBar (w-32, size sm => h-1.5) */}
            <div className="w-32">
              <div className="h-1.5 w-full bg-gray-700 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Body (real: line 751 — flex relative) */}
      <div className="flex relative">
        {/* Main content column (real: line 753) */}
        <main className="flex-1 min-w-0 xl:mr-80">
          {/* Video area — black aspect-video (only when explicitly VIDEO) */}
          {effectiveContentType === "VIDEO" && (
            <div className="bg-black aspect-video flex items-center justify-center">
              <div className="w-20 h-20 bg-gray-800 rounded-2xl animate-pulse" />
            </div>
          )}

          {/* Lesson content — white (real: line 818) */}
          <div className="p-3 sm:p-6 bg-white">
            <div className="max-w-4xl mx-auto animate-pulse">
              {/* Lesson header row (real: line 821) */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                <div className="flex-1 min-w-0">
                  {/* h2 text-2xl title */}
                  <div className="h-8 w-2/3 bg-gray-200 rounded mb-2" />
                  {/* description */}
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                </div>
                {/* Mark Complete button */}
                <div className="h-10 w-36 bg-gray-200 rounded-lg flex-shrink-0" />
              </div>

              {/* UNKNOWN / NEUTRAL TYPE: Neutral Card Shell (No Video assumption) */}
              {!effectiveContentType && (
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

              {/* ARTICLE type: ArticleViewer skeleton card */}
              {effectiveContentType === "ARTICLE" && (
                <Card className="p-4 sm:p-8 mb-6">
                  {/* Article Title */}
                  <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
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

              {/* QUIZ type: Question card skeleton */}
              {effectiveContentType === "QUIZ" && (
                <Card className="p-4 sm:p-6 mb-6">
                  {/* Quiz Header */}
                  <div className="h-5 w-2/3 bg-gray-200 rounded mb-4" />
                  {/* 4 Radio choice options */}
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex items-center p-3 border border-gray-200 rounded-md"
                      >
                        <div className="w-4 h-4 rounded-full bg-gray-200 mr-3 flex-shrink-0" />
                        <div
                          className={`h-4 bg-gray-200 rounded ${
                            i === 1
                              ? "w-1/2"
                              : i === 2
                              ? "w-2/3"
                              : i === 3
                              ? "w-1/3"
                              : "w-3/4"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Take Quiz & Summary (VIDEO & ARTICLE types) */}
              {effectiveContentType !== "QUIZ" && (
                <>
                  <div className="mb-6">
                    <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                  </div>

                  {/* AI Lesson Summary panel placeholder */}
                  <div className="border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
                    <div className="h-5 w-48 bg-gray-200 rounded" />
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-4/5 bg-gray-100 rounded" />
                  </div>
                </>
              )}

              {/* Navigation buttons (real: line 933) */}
              <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
                <div className="justify-self-start w-32 sm:w-44 md:w-52 h-11 sm:h-12 bg-gray-200 rounded-lg" />
                <div className="justify-self-end w-32 sm:w-44 md:w-52 h-11 sm:h-12 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar — white curriculum panel (real: line 962). Fixed w-80, xl only. */}
        <aside
          className="hidden xl:block fixed right-0 w-80 h-full bg-white border-l border-gray-200 z-40"
          style={{ top: "57px" }}
        >
          <div className="h-full overflow-hidden pb-20">
            {/* "Course Content" header (real: line 973) */}
            <div className="p-4 border-b bg-gray-50 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-44 bg-gray-200 rounded mt-2" />
            </div>

            {/* Section list — sections start expanded (real: line 980, 203) */}
            <div className="p-2 space-y-4 animate-pulse">
              {Array.from({ length: 3 }, (_, s) => (
                <div
                  key={s}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Section header (real: line 996, px-3 py-2 bg-gray-100) */}
                  <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                      <div className="h-2.5 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </div>

                  {/* Expanded lessons (real: line 1023) */}
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
  );
};

export default CoursePlayerSkeleton;
