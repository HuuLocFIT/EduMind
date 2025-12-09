import { z } from "zod";

import {
  createApiResponseSchema,
  createPagedResponseSchema,
} from "./auth.schemas.js";

export const AdminCreateUserRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be between 3 and 50 characters")
    .max(50, "Username must be between 3 and 50 characters"),
  email: z
    .string()
    .trim()
    .email("Email should be valid")
    .max(100, "Email must not exceed 100 characters"),
  password: z
    .string()
    .min(6, "Password must be between 6 and 100 characters")
    .max(100, "Password must be between 6 and 100 characters"),
  firstName: z.string().max(50, "First name must not exceed 50 characters").optional().nullable(),
  lastName: z.string().max(50, "Last name must not exceed 50 characters").optional().nullable(),
  phoneNumber: z
    .string()
    .max(20, "Phone number must not exceed 20 characters")
    .optional()
    .nullable(),
  roles: z.array(z.string()).min(1, "At least one role is required"),
});

export const AdminUpdateUserRoleRequestSchema = z.object({
  roles: z.array(z.string()).min(1, "At least one role is required"),
});

// Enums
export const ApplicationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const DocumentTypeSchema = z.enum(["CERTIFICATE", "DEGREE", "ID_CARD"]);
export const ReviewActionSchema = z.enum(["APPROVE", "REJECT"]);
export const TeacherTypeSchema = z.enum(["TRIAL", "FULL"]);

// Request schemas
export const ReviewApplicationRequestSchema = z.object({
  action: ReviewActionSchema,
  teacherType: TeacherTypeSchema.optional(),
  rejectionReason: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
});

export const UpgradeTrialRequestSchema = z.object({
  adminNotes: z.string().optional().nullable(),
});

export const DocumentInfoSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  url: z.string().url("Document URL must be a valid URL"),
  type: DocumentTypeSchema,
});

export const TeacherApplicationRequestSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters"),
  email: z
    .string()
    .trim()
    .email("Email should be valid")
    .min(1, "Email is required"),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid phone number format")
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must not exceed 200 characters"),
  experienceYears: z
    .number()
    .int("Experience years must be an integer")
    .min(0, "Experience years must be positive")
    .optional()
    .nullable(),
  qualifications: z
    .string()
    .trim()
    .min(1, "Qualifications are required"),
  documents: z
    .array(DocumentInfoSchema)
    .min(1, "At least one document is required"),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio must not exceed 2000 characters")
    .optional()
    .nullable(),
  motivation: z
    .string()
    .trim()
    .min(1, "Motivation is required")
    .max(1000, "Motivation must not exceed 1000 characters"),
});

// Response schemas
export const UserListItemSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  roles: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean(),
});

export const TrialStatusResponseSchema = z.object({
  userId: z.number(),
  username: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  isTrial: z.boolean(),
  trialStartDate: z.string().nullable().optional(),
  trialEndDate: z.string().nullable().optional(),
  daysRemaining: z.number().nullable().optional(),
  isExpired: z.boolean(),
});

export const StatusHistoryResponseSchema = z.object({
  id: z.number(),
  oldStatus: ApplicationStatusSchema.optional().nullable(),
  newStatus: ApplicationStatusSchema,
  changedByUsername: z.string(),
  changedByEmail: z.string().email(),
  changeReason: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const TeacherApplicationResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  username: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  experienceYears: z.number().nullable().optional(),
  qualifications: z.string().nullable().optional(),
  documents: z.array(DocumentInfoSchema).optional().nullable(),
  bio: z.string().nullable().optional(),
  motivation: z.string().nullable().optional(),
  status: ApplicationStatusSchema,
  rejectionReason: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  statusHistory: z.array(StatusHistoryResponseSchema).optional().nullable(),
});

export const AdminUserListResponseSchema = createPagedResponseSchema(
  UserListItemSchema
);

export const TeacherApplicationListResponseSchema = createPagedResponseSchema(
  TeacherApplicationResponseSchema
);

export const TrialTeachersResponseSchema = createPagedResponseSchema(
  TrialStatusResponseSchema
);

export const AdminMessageResponseSchema = createApiResponseSchema();
export const TeacherApplicationDetailResponseSchema = createApiResponseSchema(
  TeacherApplicationResponseSchema
);

export type StatusHistoryResponse = z.infer<typeof StatusHistoryResponseSchema>;
// Types
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type AdminCreateUserRequest = z.infer<typeof AdminCreateUserRequestSchema>;
export type AdminUpdateUserRoleRequest = z.infer<typeof AdminUpdateUserRoleRequestSchema>;
export type ReviewAction = z.infer<typeof ReviewActionSchema>;
export type TeacherType = z.infer<typeof TeacherTypeSchema>;
export type ReviewApplicationRequest = z.infer<typeof ReviewApplicationRequestSchema>;
export type UpgradeTrialRequest = z.infer<typeof UpgradeTrialRequestSchema>;
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>;
export type TeacherApplicationRequest = z.infer<typeof TeacherApplicationRequestSchema>;
export type UserListItem = z.infer<typeof UserListItemSchema>;
export type TrialStatusResponse = z.infer<typeof TrialStatusResponseSchema>;
export type TeacherApplicationResponse = z.infer<
  typeof TeacherApplicationResponseSchema
>;
export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>;
export type TeacherApplicationListResponse = z.infer<
  typeof TeacherApplicationListResponseSchema
>;
export type TrialTeachersResponse = z.infer<typeof TrialTeachersResponseSchema>;
export type AdminMessageResponse = z.infer<typeof AdminMessageResponseSchema>;
export type TeacherApplicationDetailResponse = z.infer<
  typeof TeacherApplicationDetailResponseSchema
>;

