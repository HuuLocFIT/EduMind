import React, { useEffect, useState } from "react";
import { teacherCourseService } from '../../../../services/teacher-course.service';
import type { ReviewResponse } from "@edumind/shared-types";
import { Skeleton, RatingStars } from "@edumind/user-ui";
import { formatDate } from "@edumind/shared-utils";
import { Star } from "lucide-react";

interface ReviewsTabProps {
  courseId: number;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ courseId }) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherCourseService
      .getCourseReviews(courseId, { page: 0, size: 20 })
      .then((res) => setReviews(res.data || []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No reviews yet
        </h3>
        <p className="text-gray-600">
          Reviews will appear here once students leave feedback
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {review.avatarUrl ? (
                <img
                  src={review.avatarUrl}
                  alt={review.studentName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <span className="text-gray-500 font-medium">
                  {review.studentName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{review.studentName}</p>
              <div className="flex items-center gap-2">
                <RatingStars rating={review.rating} size="sm" />
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};

