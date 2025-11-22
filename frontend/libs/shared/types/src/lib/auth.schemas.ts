import { z } from "zod";

export const UserRoleSchema = z.enum([
  "STUDENT",
  "TEACHER",
  "TEACHER_TRIAL",
  "ADMIN",
]);

export const ProviderSchema = z.enum(["LOCAL", "GOOGLE", "FACEBOOK"]);

// ============================================
// 2. USER SCHEMA
// ============================================
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  roles: z.array(
    z.object({
      id: z.number(),
      name: UserRoleSchema,
    })
  ),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
  is2faEnabled: z.boolean(),
  profilePictureUrl: z.string().optional(),
  createdAt: z.string(), // ISO date
  updatedAt: z.string(),
  lastLoginAt: z.string().optional(),
  // Trial fields
  isTrial: z.boolean().optional(),
  trialStartDate: z.string().optional(),
  trialEndDate: z.string().optional(),
});

// ============================================
// 3. REQUEST SCHEMAS
// ============================================

// Signup Request
export const SignupRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscore, and hyphen"
    ),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name too long"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name too long"),
  phoneNumber: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid phone number format")
    .optional(),
});

// Login Request
export const LoginRequestSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

// 2FA Login Request
export const TwoFactorLoginRequestSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string(),
  code: z
    .string()
    .length(6, "2FA code must be 6 digits")
    .regex(/^\d+$/, "2FA code must be numeric"),
});

// Forgot Password Request
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

// Reset Password Request
export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

// Verify Email Request
export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// Resend Verification Request
export const ResendVerificationRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// 2FA Setup Verify Request
export const Verify2FACodeRequestSchema = z.object({
  code: z
    .string()
    .length(6, "2FA code must be 6 digits")
    .regex(/^\d+$/, "2FA code must be numeric"),
});

// ============================================
// 4. RESPONSE SCHEMAS
// ============================================

// Auth Response - includes tokens + user
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

// Refresh Token Response
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
});

// Message Response
export const MessageResponseSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
  success: z.boolean().optional(),
});

// 2FA Setup Response - includes QR code data
export const Setup2FAResponseSchema = z.object({
  qrCodeUrl: z.string(), // data:image/png;base64,...
  secret: z.string(),
  backupCodes: z.array(z.string()),
});

// API Error Response
export const ApiErrorSchema = z.object({
  message: z.string(),
  status: z.number(),
  timestamp: z.string(),
  path: z.string().optional(),
});

// ============================================
// 5. AUTO-GENERATED TYPES
// ============================================

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

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type Setup2FAResponse = z.infer<typeof Setup2FAResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================
// 6. HELPER FUNCTIONS
// ============================================

// Get display name from user
export function getUserDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.username || user.email.split("@")[0];
}

// Get primary role
export function getPrimaryRole(user: User): UserRole {
  return user.roles[0]?.name || "STUDENT";
}

// Check if trial expired
export function isTrialExpired(user: User): boolean {
  if (!user.isTrial || !user.trialEndDate) return false;
  return new Date() > new Date(user.trialEndDate);
}

// Validate password strength (for UI feedback)
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "red" };
  if (score <= 4) return { score, label: "Medium", color: "yellow" };
  return { score, label: "Strong", color: "green" };
}
