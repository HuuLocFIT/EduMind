import { z } from "zod";

import { UserRole, PROVIDER } from "@edumind/shared-constants";
import {
  createNumericCodeSchema,
  createPasswordSchema,
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
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});

export const JwtResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string().default("Bearer"),
  user: UserSchema,
});

// Request schemas
export const SignupRequestSchema = z.object({
  username: createUsernameSchema(),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: createPasswordSchema(),
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
  confirmPassword: createPasswordSchema(),
});

export const ChangePasswordRequestSchema = z.object({
  currentPassword: createRequiredStringSchema("Current password"),
  newPassword: createPasswordSchema(),
  confirmPassword: createPasswordSchema(),
});

export const UpdateProfileRequestSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters")
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .max(20, "Phone number must not exceed 20 characters")
    .regex(/^[+]?[0-9\s\-()]*$/, "Invalid phone number format")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must not exceed 500 characters")
    .optional(),
  profilePictureUrl: z
    .string()
    .trim()
    .max(500, "Profile picture URL must not exceed 500 characters")
    .url("Profile picture must be a valid URL")
    .optional(),
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
  tokenType: z.string().default('Bearer'),
  user: UserSchema.optional(),
});

export const Setup2FAResponseSchema = z.object({
  qrCodeUrl: z.string(), // data:image/png;base64,...
  secret: z.string(),
  backupCodes: z.array(z.string()),
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
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<
  typeof ResendVerificationRequestSchema
>;
export type Verify2FACodeRequest = z.infer<typeof Verify2FACodeRequestSchema>;

export type JwtResponse = z.infer<typeof JwtResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type Setup2FAResponse = z.infer<typeof Setup2FAResponseSchema>;
