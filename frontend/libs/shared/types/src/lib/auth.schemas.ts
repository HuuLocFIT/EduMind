import { z, type ZodTypeAny } from "zod";

import { UserRole, PROVIDER } from "@edumind/shared-constants";
import {
  createNumericCodeSchema,
  createPasswordSchema,
  createPhoneNumberSchema,
  createRequiredStringSchema,
  createUsernameSchema,
} from "./auth.validation.js";

export const UserRoleSchema = z.nativeEnum(UserRole);

export const ProviderSchema = z.nativeEnum(PROVIDER);

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  roles: z.array(UserRoleSchema),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
  is2faEnabled: z.boolean(),
  isTrial: z.boolean(),
  trialStartDate: z.string().nullable().optional(),
  trialEndDate: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});

export const JwtResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.string().default("Bearer"),
  user: UserSchema,
});

// Request schemas
export const SignupRequestSchema = z.object({
  username: createUsernameSchema(),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: createPasswordSchema(),
  firstName: z
    .string()
    .max(50, "First name too long")
    .optional(),
  lastName: z
    .string()
    .max(50, "Last name too long")
    .optional(),
  phoneNumber: createPhoneNumberSchema().optional(),
});

export const LoginRequestSchema = z.object({
  usernameOrEmail: createRequiredStringSchema("Username or email"),
  password: createRequiredStringSchema("Password"),
});

export const TwoFactorLoginRequestSchema = z.object({
  usernameOrEmail: createRequiredStringSchema("Username or email"),
  password: createRequiredStringSchema("Password"),
  code: createNumericCodeSchema({ fieldLabel: "2FA code" }),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

export const ResetPasswordRequestSchema = z.object({
  token: createRequiredStringSchema("Token"),
  newPassword: createPasswordSchema(),
});

export const VerifyEmailRequestSchema = z.object({
  token: createRequiredStringSchema("Token"),
});

export const ResendVerificationRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const Verify2FACodeRequestSchema = z.object({
  code: createNumericCodeSchema({ fieldLabel: "2FA code" }),
});

// Response schemas
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
});

export const MessageResponseSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
  success: z.boolean().optional(),
});

export const Setup2FAResponseSchema = z.object({
  qrCodeUrl: z.string(), // data:image/png;base64,...
  secret: z.string(),
  backupCodes: z.array(z.string()),
});

export const ApiErrorSchema = z.object({
  message: z.string(),
  status: z.number(),
  timestamp: z.string(),
  path: z.string().optional(),
});

// Generic ApiResponse helpers & schemas
export const ApiResponseBaseSchema = z.object({
  status: z.number(),
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
  path: z.string().optional(),
});

export const createApiResponseSchema = <T extends ZodTypeAny>(dataSchema?: T) =>
  ApiResponseBaseSchema.extend({
    data: dataSchema ? dataSchema.optional() : z.any().optional(),
  });

export const PaginationMetadataSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  hasNext: z.boolean().optional(),
  hasPrevious: z.boolean().optional(),
});

export const createPagedResponseSchema = <T extends ZodTypeAny>(itemSchema: T) =>
  createApiResponseSchema(z.array(itemSchema)).extend({
    pagination: PaginationMetadataSchema.optional(),
  });

// Types
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type User = z.infer<typeof UserSchema>;

export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type TwoFactorLoginRequest = z.infer<typeof TwoFactorLoginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<
  typeof ResendVerificationRequestSchema
>;
export type Verify2FACodeRequest = z.infer<typeof Verify2FACodeRequestSchema>;

export type JwtResponse = z.infer<typeof JwtResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type Setup2FAResponse = z.infer<typeof Setup2FAResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
  requestId?: string;
  path?: string;
}

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

export interface PagedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: PaginationMetadata;
}
