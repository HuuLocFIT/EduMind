import React from "react";
import { Skeleton, Card } from "@edumind/user-ui";

export const CourseCardSkeleton: React.FC = () => {
  return (
    <Card>
      {/* Thumbnail */}
      <Skeleton variant="rectangular" height="192px" className="rounded-t-lg" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton variant="text" height="1.25rem" />
        <Skeleton variant="text" width="60%" height="1.25rem" />

        {/* Instructor */}
        <Skeleton variant="text" width="40%" />

        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width="20px" height="20px" />
          <Skeleton variant="circular" width="20px" height="20px" />
          <Skeleton variant="circular" width="20px" height="20px" />
          <Skeleton variant="circular" width="20px" height="20px" />
          <Skeleton variant="circular" width="20px" height="20px" />
          <Skeleton variant="text" width="60px" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Skeleton variant="text" width="80px" />
          <Skeleton variant="text" width="80px" />
        </div>

        {/* Price */}
        <Skeleton variant="text" width="100px" height="1.5rem" />
      </div>
    </Card>
  );
};
