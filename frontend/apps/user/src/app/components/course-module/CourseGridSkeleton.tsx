import React from "react";

interface CourseGridSkeletonProps {
  /** Number of placeholder cards to render. */
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
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
  <div data-testid="course-card-skeleton" className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    {/* Thumbnail — matches h-44 sm:h-48 lg:h-52 */}
    <div className="h-44 bg-gray-200 animate-pulse motion-reduce:animate-none sm:h-48 lg:h-52" />

    {/* Content — matches p-4 sm:p-5 */}
    <div className="flex flex-grow flex-col p-4 animate-pulse motion-reduce:animate-none sm:p-5">
      {/* Title (2 lines, min-h-[3.5rem]) */}
      <div className="mb-1.5 min-h-[3.5rem] space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Instructor */}
      <div className="mb-3 h-5 w-2/5 rounded bg-gray-200" />

      {/* Rating / meta row */}
      <div className="mb-5 h-5 w-3/5 rounded bg-gray-200" />

    </div>
    <div className="flex items-end justify-between gap-3 px-4 pb-4 animate-pulse motion-reduce:animate-none sm:px-5 sm:pb-5">
      <div className="h-7 w-24 rounded bg-gray-200" />
      <div className="h-9 w-24 rounded-lg bg-gray-200" />
    </div>
  </div>
);

export const CourseGridSkeleton: React.FC<CourseGridSkeletonProps> = ({
  count = 9,
  columns = 3,
  className = "",
}) => (
  <div
    className={`grid ${gridClasses[columns]} gap-3 sm:gap-4 lg:gap-6 ${className}`}
    aria-hidden="true"
    inert
  >
    {Array.from({ length: count }, (_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default CourseGridSkeleton;
