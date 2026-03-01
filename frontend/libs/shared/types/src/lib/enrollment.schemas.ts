import { EnrollmentStatus } from "@edumind/shared-constants";
import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas.js";

export const EnrollmentStatusSchema = z.nativeEnum(EnrollmentStatus);

export const EnrollRequestSchema = z.object({
  courseId: z.number().int().positive("Course ID is required"),
});

export const SuspendEnrollmentRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason must not exceed 500 characters"),
});

export const ReportToAdminRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason must not exceed 500 characters"),
});

export const EnrollmentResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  courseThumbnail: z.string().optional().nullable(),
  coursePrice: z.number().optional().nullable(),
  courseIsPaid: z.boolean().optional().nullable(),

  // Core student identification
  studentId: z.number(),

  // Optional denormalized student profile info for instructor views.
  // These fields may be populated by the API gateway or LMS service by
  // joining with the auth-service. They are optional to remain backwards
  // compatible with existing responses.
  studentName: z.string().optional().nullable(),
  studentEmail: z.string().optional().nullable(),
  studentAvatarUrl: z.string().optional().nullable(),

  // Progress
  progressPercentage: z.number().nullable().optional(),
  completedLessons: z.number().nullable().optional(),
  totalLessons: z.number().nullable().optional(),

  // Status
  status: EnrollmentStatusSchema,

  // Completion
  enrolledAt: z.string(),
  completedAt: z.string().nullable().optional(),
  certificateUrl: z.string().optional().nullable(),

  // Timestamps
  lastAccessedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  
  // Suspension reason (for audit/logging)
  suspensionReason: z.string().optional().nullable(),
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

export const ReportRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const EnrollmentReportResponseSchema = z.object({
  id: z.number(),
  status: ReportRequestStatusSchema,
  reason: z.string(),
  adminNotes: z.string().optional().nullable(),
  requestedAt: z.string(),
  reviewedAt: z.string().optional().nullable(),
  reviewedByAdminId: z.number().optional().nullable(),
  teacherId: z.number(),
  enrollmentId: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  studentId: z.number(),
  studentName: z.string().optional().nullable(),
  studentEmail: z.string().optional().nullable(),
});

export const ReviewReportRequestSchema = z.object({
  adminNotes: z.string().max(1000).optional(),
});

export const EnrollmentReportPagedResponseSchema = createPagedResponseSchema(
  EnrollmentReportResponseSchema
);

export type EnrollRequest = z.infer<typeof EnrollRequestSchema>;
export type SuspendEnrollmentRequest = z.infer<typeof SuspendEnrollmentRequestSchema>;
export type ReportToAdminRequest = z.infer<typeof ReportToAdminRequestSchema>;
export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;
export type EnrollmentStatsResponse = z.infer<
  typeof EnrollmentStatsResponseSchema
>;
export type EnrollmentListResponse = z.infer<typeof EnrollmentListSchema>;
export type EnrollmentPagedResponse = z.infer<typeof EnrollmentPagedResponseSchema>;
export type ReportRequestStatus = z.infer<typeof ReportRequestStatusSchema>;
export type EnrollmentReportResponse = z.infer<typeof EnrollmentReportResponseSchema>;
export type ReviewReportRequest = z.infer<typeof ReviewReportRequestSchema>;
export type EnrollmentReportPagedResponse = z.infer<typeof EnrollmentReportPagedResponseSchema>;