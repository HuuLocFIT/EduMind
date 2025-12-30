import React from "react";
import { Loader2, MessageSquareOff } from "lucide-react";
import { TeacherReviewCard } from "../../../../components/teacher/reviews/TeacherReviewCard";
import type { ReviewResponse } from "@edumind/shared-types";
import type { FilterTab } from "../types/reviews.types";

interface ReviewsListProps {
  reviews: ReviewResponse[];
  loading: boolean;
  statusFilter: FilterTab;
  processingReviewId: number | null;
  onReply: (review: ReviewResponse) => void;
  onEditReply: (review: ReviewResponse) => void;
  onDeleteReply: (review: ReviewResponse) => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  loading,
  statusFilter,
  processingReviewId,
  onReply,
  onEditReply,
  onDeleteReply,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <MessageSquareOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No reviews found
        </h3>
        <p className="text-gray-500">
          {statusFilter === "unreplied"
            ? "Great job! You've replied to all reviews."
            : "No reviews match your current filters."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <TeacherReviewCard
          key={review.id}
          review={review}
          onReply={onReply}
          onEditReply={onEditReply}
          onDeleteReply={onDeleteReply}
          isProcessing={processingReviewId === review.id}
        />
      ))}
    </div>
  );
};

