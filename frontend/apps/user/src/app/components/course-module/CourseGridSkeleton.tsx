import React from "react";

interface CourseGridSkeletonProps {
  /** Number of placeholder cards to render. */
  count?: number;
  columns?: 2 | 3 | 4;
}

const gridClasses: Record<NonNullable<CourseGridSkeletonProps["columns"]>, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Placeholder card that mirrors <CourseCard /> pixel-for-pixel (same radius,
 * border, thumbnail heights, padding and title min-height) so that when the
 * real cards arrive they land exactly where the skeleton was — no reflow, no
 * flash.
 */
const CardSkeleton: React.FC = () => (
  <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
    {/* Thumbnail — matches h-44 sm:h-48 lg:h-52 */}
    <div className="h-44 sm:h-48 lg:h-52 bg-gray-200 animate-pulse" />

    {/* Content — matches p-4 sm:p-5 */}
    <div className="flex flex-col flex-grow p-4 sm:p-5 animate-pulse">
      {/* Title (2 lines, min-h-[3.5rem]) */}
      <div className="mb-1.5 min-h-[3.5rem] space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Instructor */}
      <div className="h-3 bg-gray-200 rounded w-2/5 mb-3" />

      {/* Rating / meta row */}
      <div className="h-3 bg-gray-200 rounded w-3/5 mb-5" />

      {/* Bottom: price + action button */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between gap-3">
        <div className="h-7 bg-gray-200 rounded w-24" />
        <div className="h-9 bg-gray-200 rounded-full w-24" />
      </div>
    </div>
  </div>
);

export const CourseGridSkeleton: React.FC<CourseGridSkeletonProps> = ({
  count = 9,
  columns = 3,
}) => (
  <div
    className={`grid ${gridClasses[columns]} gap-3 sm:gap-4 lg:gap-6`}
    aria-hidden="true"
  >
    {Array.from({ length: count }, (_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default CourseGridSkeleton;
