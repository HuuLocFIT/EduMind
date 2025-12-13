import { EnrollmentStatus } from "@edumind/shared-constants";
import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas";

export const EnrollmentStatusSchema = z.nativeEnum(EnrollmentStatus);

export const EnrollRequestSchema = z.object({
  courseId: z.number().int().positive("Course ID is required"),
});

export const EnrollmentResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  courseThumbnail: z.string().optional().nullable(),
  studentId: z.number(),
  progressPercentage: z.number().nullable().optional(),
  completedLessons: z.number().nullable().optional(),
  totalLessons: z.number().nullable().optional(),
  status: EnrollmentStatusSchema,
  enrolledAt: z.string(),
  completedAt: z.string().nullable().optional(),
  certificateUrl: z.string().optional().nullable(),
  lastAccessedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const EnrollmentStatsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  started: z.number().int().nonnegative(),
});

export const EnrollmentListSchema = z.array(EnrollmentResponseSchema);

export const EnrollmentPagedResponseSchema = createPagedResponseSchema(
  EnrollmentResponseSchema
);

export type EnrollRequest = z.infer<typeof EnrollRequestSchema>;
export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;
export type EnrollmentStatsResponse = z.infer<
  typeof EnrollmentStatsResponseSchema
>;
export type EnrollmentListResponse = z.infer<typeof EnrollmentListSchema>;
export type EnrollmentPagedResponse = z.infer<typeof EnrollmentPagedResponseSchema>;