import React, { useState, useEffect } from "react";
import { X, Star, User, Send, Loader2 } from "lucide-react";
import type { ReviewResponse } from "@edumind/shared-types";

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewResponse | null;
  onSubmit: (reviewId: number, reply: string) => Promise<void>;
  mode: "create" | "edit";
}

export const ReplyModal: React.FC<ReplyModalProps> = ({
  isOpen,
  onClose,
  review,
  onSubmit,
  mode,
}) => {
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 1000;

  useEffect(() => {
    if (isOpen && review) {
      setReply(mode === "edit" && review.instructorReply ? review.instructorReply : "");
      setError(null);
    }
  }, [isOpen, review, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!review) return;

    const trimmedReply = reply.trim();

    if (trimmedReply.length < MIN_LENGTH) {
      setError(`Reply must be at least ${MIN_LENGTH} characters`);
      return;
    }

    if (trimmedReply.length > MAX_LENGTH) {
      setError(`Reply must not exceed ${MAX_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(review.id, trimmedReply);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
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

  if (!isOpen || !review) return null;

  const charCount = reply.length;
  const isValidLength = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClose();
          }
        }}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "create" ? "Reply to Review" : "Edit Reply"}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Review Preview */}
          <div className="p-5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start gap-3">
              {review.avatarUrl || review.profilePictureUrl ? (
                <img
                  src={review.avatarUrl || review.profilePictureUrl!}
                  alt={review.studentName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {review.studentName}
                  </span>
                  {renderStars(review.rating)}
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                  {review.comment || <em>No comment</em>}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="reply"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Reply
                </label>
                <textarea
                  id="reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Thank the student and provide helpful feedback..."
                  rows={5}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />

                {/* Character Count */}
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={`text-xs ${
                      charCount < MIN_LENGTH
                        ? "text-orange-500"
                        : charCount > MAX_LENGTH
                        ? "text-red-500"
                        : "text-gray-500"
                    }`}
                  >
                    {charCount < MIN_LENGTH
                      ? `${MIN_LENGTH - charCount} more characters needed`
                      : charCount > MAX_LENGTH
                      ? `${charCount - MAX_LENGTH} characters over limit`
                      : `${charCount}/${MAX_LENGTH} characters`}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isValidLength}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {mode === "create" ? "Submit Reply" : "Update Reply"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;