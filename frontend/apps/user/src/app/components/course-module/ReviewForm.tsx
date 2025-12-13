import React, { useState } from "react";
import { Button, Textarea } from "@edumind/user-ui";
import { Star } from "lucide-react";

// Validation schema for comment (optional but if provided, must meet min/max requirements)
const validateComment = (value: string): string => {
  if (!value || value.trim().length === 0) {
    return ""; // Empty is allowed
  }
  const trimmedLength = value.trim().length;
  if (trimmedLength < 10) {
    return "Comment must be at least 10 characters";
  }
  if (trimmedLength > 1000) {
    return "Comment must not exceed 1000 characters";
  }
  return "";
};

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  initialRating?: number;
  initialComment?: string;
  submitLabel?: string;
  className?: string;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  initialRating = 0,
  initialComment = "",
  submitLabel = "Submit Review",
  className = "",
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [commentError, setCommentError] = useState<string>("");

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    // Validate and show error when user types (only if there was an error before)
    if (commentError) {
      const error = validateComment(value);
      setCommentError(error);
    }
  };

  const handleCommentBlur = () => {
    const error = validateComment(comment);
    setCommentError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    // Validate comment if provided
    const error = validateComment(comment);
    if (error) {
      setCommentError(error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(rating, comment);
      setRating(0);
      setComment("");
      setCommentError("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Rating Stars */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <Textarea
          label="Comment (Optional)"
          value={comment}
          onChange={handleCommentChange}
          onBlur={handleCommentBlur}
          rows={4}
          placeholder="Share your thoughts about this course..."
          error={commentError}
          fullWidth
          helperText={
            comment.trim().length > 0
              ? `${comment.trim().length}/1000 characters`
              : undefined
          }
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        isLoading={loading}
        disabled={rating === 0}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  );
};
