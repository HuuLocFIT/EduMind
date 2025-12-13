import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas";

export const CreateReviewRequestSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must not exceed 1000 characters"),
});

export const UpdateReviewRequestSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must not exceed 1000 characters"),
});

export const ReviewResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  studentId: z.number(),
  studentName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  isApproved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReviewPagedResponseSchema = createPagedResponseSchema(ReviewResponseSchema);

export const RatingDistributionResponseSchema = z.object({
    courseId: z.number(),
    averageRating: z.number(),
    totalReviews: z.number(),
    distribution: z.record(z.string(), z.number()),
  });

export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type RatingDistributionResponse = z.infer<
  typeof RatingDistributionResponseSchema
>;
export type ReviewPagedResponse = z.infer<typeof ReviewPagedResponseSchema>;