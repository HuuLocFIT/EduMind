import {
  Star,
  MessageSquare,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  User,
} from "lucide-react";
import type { ReviewResponse } from "@edumind/shared-types";
import { formatDistanceToNow } from "date-fns";

interface ReviewCardProps {
  review: ReviewResponse;
  onReply: (review: ReviewResponse) => void;
  onEditReply: (review: ReviewResponse) => void;
  onDeleteReply: (review: ReviewResponse) => void;
  isProcessing?: boolean;
}

export const TeacherReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onReply,
  onEditReply,
  onDeleteReply,
  isProcessing = false,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getAvatarUrl = () => {
    return review.avatarUrl || review.profilePictureUrl || null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()!}
                alt={review.studentName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">
                {review.studentName}
              </span>
              {renderStars(review.rating)}
            </div>

            {/* Course Info */}
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate">{review.courseTitle}</span>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1 text-sm text-gray-400 flex-shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {/* Review Content */}
      <div className="mt-4">
        <p className="text-gray-700 leading-relaxed">
          {review.comment || <em className="text-gray-400">No comment</em>}
        </p>
      </div>

      {/* Instructor Reply */}
      {review.hasReply && review.instructorReply && (
        <div className="mt-4 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Your Reply</span>
            {review.instructorReplyAt && (
              <span className="text-xs text-blue-500">
                {formatDate(review.instructorReplyAt)}
              </span>
            )}
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {review.instructorReply}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
        {review.hasReply ? (
          <>
            <button
              onClick={() => onEditReply(review)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" />
              Edit Reply
            </button>
            <button
              onClick={() => onDeleteReply(review)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Reply
            </button>
          </>
        ) : (
          <button
            onClick={() => onReply(review)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            Reply
          </button>
        )}
      </div>
    </div>
  );
};

export default TeacherReviewCard;