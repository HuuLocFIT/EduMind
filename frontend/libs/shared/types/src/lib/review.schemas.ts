import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas.js";

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

export const InstructorReplyRequestSchema = z.object({
  reply: z
    .string()
    .min(10, "Reply must be at least 10 characters")
    .max(1000, "Reply must not exceed 1000 characters"),
});

export const ReviewResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),
  studentId: z.number(),
  studentName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  isFlagged: z.boolean().optional(),
  isApproved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  instructorReply: z.string().nullable().optional(),
  instructorReplyAt: z.string().nullable().optional(),
  hasReply: z.boolean().optional(),
});

export const ReviewPagedResponseSchema = createPagedResponseSchema(ReviewResponseSchema);

export const RatingDistributionResponseSchema = z.object({
    courseId: z.number(),
    averageRating: z.number(),
    totalReviews: z.number(),
    distribution: z.record(z.string(), z.number()),
  });

export const InstructorReviewsStatsResponseSchema = z.object({
  totalReviews: z.number(),
  averageRating: z.number(),
  repliedCount: z.number(),
  needReplyCount: z.number(),
  ratingDistribution: z.record(z.string(), z.number()),
});

export const CourseWithReviewsSchema = z.object({
  id: z.number(),
  title: z.string(),
});

export const CourseWithReviewsListSchema = z.array(CourseWithReviewsSchema);

export const TeacherReviewFilterParamsSchema = z.object({
  courseId: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  hasReply: z.boolean().optional(),
  page: z.number().optional(),
  size: z.number().optional(),
  sortBy: z.enum(["createdAt", "rating", "updatedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});


export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;
export type InstructorReplyRequest = z.infer<typeof InstructorReplyRequestSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type RatingDistributionResponse = z.infer<
  typeof RatingDistributionResponseSchema
>;
export type ReviewPagedResponse = z.infer<typeof ReviewPagedResponseSchema>;
export type InstructorReviewsStatsResponse = z.infer<
  typeof InstructorReviewsStatsResponseSchema
>;
export type CourseWithReviews = z.infer<typeof CourseWithReviewsSchema>;
export type CourseWithReviewsList = z.infer<typeof CourseWithReviewsListSchema>;
export type TeacherReviewFilterParams = z.infer<typeof TeacherReviewFilterParamsSchema>;