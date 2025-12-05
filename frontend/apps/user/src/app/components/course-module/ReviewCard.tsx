import React from "react";
import { Card } from "@edumind/user-ui";
import { RatingStars } from "@edumind/user-ui";
import type { ReviewResponse } from "@edumind/shared-types";
import { useAuthStore } from "@user/stores/auth.store";

interface ReviewCardProps {
  review: ReviewResponse;
  className?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  className = "",
}) => {
  const { user } = useAuthStore();

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {review.avatarUrl || review.profilePictureUrl ? (
              <img src={review.avatarUrl || review.profilePictureUrl || ""} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              review.studentName?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {user?.id === review.studentId ? "Me" : review.studentName || "Anonymous"}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <RatingStars rating={review.rating} size="sm" />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
      )}
    </Card>
  );
};
