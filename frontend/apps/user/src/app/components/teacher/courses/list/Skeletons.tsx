import React from "react";
import { Skeleton } from "@edumind/user-ui";

export const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border overflow-hidden">
        {/* Thumbnail with status badge */}
        <div className="relative aspect-video bg-gray-100">
          <Skeleton className="w-full h-full rounded-none" />
          <div className="absolute top-2 left-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* 2-line title placeholder */}
          <div className="space-y-1.5 mb-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>

          {/* 3-item metadata row */}
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 bg-white rounded-lg border"
      >
        {/* Thumbnail */}
        <Skeleton className="w-20 h-14 rounded-lg flex-shrink-0" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-48 mb-1" />
          <div className="flex items-center gap-4 mt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>

        {/* Price */}
        <Skeleton className="h-5 w-16 flex-shrink-0" />

        {/* Menu Button */}
        <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
      </div>
    ))}
  </div>
);

