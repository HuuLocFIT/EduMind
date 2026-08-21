import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService } from '../../services/auth.service';
import { Lock, CheckCircle } from "lucide-react";

import {
  Button,
  PasswordInput,
  Card,
} from "@edumind/user-ui";
import { USER_ROUTES } from "@edumind/shared-utils";
import { AuthErrorSummary } from "./components/AuthErrorSummary";
import { AuthBackLink } from "./components/AuthBackLink";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type TokenState = 'validating' | 'valid' | 'invalid' | 'unavailable';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [tokenState, setTokenState] = useState<TokenState>(
    token ? 'validating' : 'invalid'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState("");
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Use ref to prevent duplicate validation calls in Strict Mode
  const hasVerifiedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password");

  const validateToken = useCallback(async (resetToken: string) => {
    setTokenState('validating');
    try {
      await authService.validateResetToken(resetToken);
      setTokenState('valid');
    } catch (err: any) {
      if (err?.status === 400) {
        setTokenState('invalid');
      } else {
        setTokenState('unavailable');
      }
    }
  }, []);

  useEffect(() => {
    // Prevent duplicate validation calls in Strict Mode
    if (hasVerifiedRef.current) {
      return;
    }

    if (token) {
      hasVerifiedRef.current = true;
      validateToken(token);
    }
  }, [token, validateToken]);

  const handleRetry = () => {
    if (!token) return;
    hasVerifiedRef.current = true;
    validateToken(token);
  };

  useEffect(() => {
    if (
      tokenState === 'invalid' ||
      tokenState === 'unavailable' ||
      tokenState === 'validating' ||
      tokenState === 'valid'
    ) {
      stateHeadingRef.current?.focus();
    }
  }, [tokenState, resetSuccess]);

  const onInvalid = () => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    setError("");
    setIsLoading(true);

    try {
      await authService.resetPassword({
        token,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });
      setResetSuccess(true);
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to reset password. Please try again.";
      if (err?.status === 400) {
        setError(errorMessage);
        setTokenState('invalid');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Checking reset link
  if (tokenState === 'validating') {
    return (
      <Card
        variant="elevated"
        padding="lg"
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1
          ref={stateHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
        >
          Checking reset link…
        </h1>
        <p role="status" className="text-gray-600">
          Please wait while we verify your reset link.
        </p>
      </Card>
    );
  }

  // Invalid / expired token
  if (tokenState === 'invalid') {
    return (
      <Card
        variant="elevated"
        padding="lg"
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1
          ref={stateHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
        >
          Invalid Reset Link
        </h1>
        <p className="text-gray-600 mb-6">
          This password reset link is invalid or has expired.
        </p>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <Link
          to={USER_ROUTES.FORGOT_PASSWORD}
          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Request New Link
        </Link>
      </Card>
    );
  }

  // Service/network error while validating the token
  if (tokenState === 'unavailable') {
    return (
      <Card
        variant="elevated"
        padding="lg"
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1
          ref={stateHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
        >
          Unable to Check Reset Link
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn't reach the server to verify your reset link. This is a
          temporary problem — your link may still be valid.
        </p>
        <Button variant="primary" fullWidth onClick={handleRetry}>
          Retry
        </Button>
        <div className="mt-4">
          <AuthBackLink to={USER_ROUTES.LOGIN} />
        </div>
      </Card>
    );
  }

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength <= 3)
      return { strength, label: "Fair", color: "bg-yellow-500" };
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength();

  if (resetSuccess) {
    return (
      <Card
        variant="elevated"
        padding="lg"
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1
          ref={stateHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
        >
          Password Reset!
        </h1>
        <p className="text-gray-600 mb-4">
          Your password has been reset successfully. You can now login with your
          new password.
        </p>
        <p role="status" className="sr-only">Password reset successfully.</p>
        <Link
          to={USER_ROUTES.LOGIN}
          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to Login
        </Link>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Page intro */}
      <div className="text-center mb-8">
        <h1
          ref={stateHeadingRef}
          tabIndex={-1}
          className="text-4xl font-bold text-gray-900 mb-2 focus:outline-none"
        >
          Reset Password
        </h1>
        <p className="text-gray-600">Create a new password</p>
      </div>

      {/* Reset Password Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Please enter a new password for your account.
          </p>
        </div>

        {/* Error Alert */}
        {(errors.password || errors.confirmPassword) && (
          <AuthErrorSummary
            ref={errorSummaryRef}
            title="Please correct the following errors"
            message={
              <ul className="mt-1 list-disc pl-5">
                {errors.password && <li>{errors.password.message}</li>}
                {errors.confirmPassword && <li>{errors.confirmPassword.message}</li>}
              </ul>
            }
            className="mb-4"
          />
        )}

        {/* Submission error (network/5xx) - keeps the form visible */}
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
          {/* New Password */}
          <div>
            <PasswordInput
              label="New Password"
              visibilityLabel="new password"
              id="new-password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              error={errors.password?.message}
              helperText="Must be at least 8 characters with uppercase, lowercase, and numbers"
              fullWidth
              {...register("password")}
            />

            {/* Password Strength */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.strength / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm New Password"
            visibilityLabel="password confirmation"
            id="confirm-new-password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            leftIcon={<Lock className="w-5 h-5" />}
            error={errors.confirmPassword?.message}
            fullWidth
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            fullWidth
          >
            Reset Password
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <AuthBackLink to={USER_ROUTES.LOGIN} />
        </div>
      </div>
    </div>
  );
}

export { ResetPasswordPage };
export default ResetPasswordPage;
