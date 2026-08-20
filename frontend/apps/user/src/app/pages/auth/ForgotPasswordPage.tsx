import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, CheckCircle, HelpCircle } from "lucide-react";

import {
  Button,
  Input,
  Alert,
  Card,
} from "@edumind/user-ui";
import { authService } from '../../services/auth.service';
import { USER_ROUTES } from "@edumind/shared-utils";
import { AuthErrorSummary } from "./components/AuthErrorSummary";
import { AuthBackLink } from "./components/AuthBackLink";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const validationAnnouncementTimerRef = useRef<number | null>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const email = watch("email");
  const validationMessages = [errors.email?.message].filter(
    (message): message is string => Boolean(message),
  );

  useEffect(() => {
    if (emailSent) confirmationHeadingRef.current?.focus();
  }, [emailSent]);

  useEffect(() => {
    if (error) requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }, [error]);

  useEffect(() => () => {
    if (validationAnnouncementTimerRef.current !== null) {
      window.clearTimeout(validationAnnouncementTimerRef.current);
    }
  }, []);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setValidationAnnouncement("");
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(data);
      setEmailSent(true);
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to send reset email. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (invalidErrors: FieldErrors<ForgotPasswordFormData>) => {
    setError("");
    setValidationAnnouncement("");
    if (validationAnnouncementTimerRef.current !== null) {
      window.clearTimeout(validationAnnouncementTimerRef.current);
    }
    const messages = [invalidErrors.email?.message].filter(
      (message): message is string => typeof message === "string",
    );
    validationAnnouncementTimerRef.current = window.setTimeout(() => {
      setValidationAnnouncement(
        `${messages.length} ${messages.length === 1 ? "error" : "errors"}. ${messages.join(". ")}`,
      );
      validationAnnouncementTimerRef.current = null;
    }, 300);
  };

  const handleResend = async () => {
    if (!email) return;

    setIsLoading(true);
    setError("");
    setResendMessage("");
    try {
      await authService.forgotPassword({ email });
      setResendMessage("Reset email sent again.");
    } catch (error: any) {
      setError(error?.message || "Failed to resend email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card variant="elevated" padding="lg" className="max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1
            ref={confirmationHeadingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
          >
            Check Your Email
          </h1>
          <p role="status" className="text-gray-600 mb-6">
            We've sent password reset instructions to{" "}
            <span className="font-semibold">{email}</span>
          </p>

          <div className="space-y-3">
            <Alert
              variant="info"
              message="The link will expire in 1 hour for security reasons."
            />

            {error && (
              <AuthErrorSummary
                ref={errorSummaryRef}
                title="Unable to resend email"
                message={error}
              />
            )}
            {resendMessage && (
              <p role="status" className="text-sm text-green-700">
                {resendMessage}
              </p>
            )}

            <div className="pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the email?
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleResend}
                isLoading={isLoading}
                fullWidth
              >
                Resend Email
              </Button>
            </div>

            <AuthBackLink to={USER_ROUTES.LOGIN} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Page intro */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Forgot Password
        </h1>
        <p className="text-gray-600">Reset your password</p>
      </div>

      {/* Forgot Password Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>
        </div>

        {/* Error Alert */}
        {validationAnnouncement && (
          <p className="sr-only" role="alert" aria-atomic="true">
            {validationAnnouncement}
          </p>
        )}
        {(validationMessages.length > 0 || error) && (
          <AuthErrorSummary
            ref={errorSummaryRef}
            role={validationMessages.length > 0 ? "group" : "alert"}
            title={
              validationMessages.length > 0
                ? `${validationMessages.length} ${validationMessages.length === 1 ? "error" : "errors"}`
                : undefined
            }
            message={
              validationMessages.length > 0 ? (
                <ul className="mt-1 list-disc pl-5">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : error
            }
            className="mb-4"
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
          <Input
            id="forgot-email"
            label="Email Address"
            type="email"
            autoComplete="email"
            required
            placeholder="your@email.com"
            leftIcon={<Mail className="w-5 h-5" />}
            error={errors.email?.message}
            helperText="We'll send a password reset link to this email"
            fullWidth
            {...register("email")}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            fullWidth
          >
            Send Reset Link
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <AuthBackLink to={USER_ROUTES.LOGIN} />
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-6 flex items-center justify-center gap-1 text-xs text-gray-500">
        <span>Having trouble?</span>
        <a
          href="mailto:support@edumind.com"
          className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 hover:no-underline"
        >
          <HelpCircle aria-hidden="true" className="w-3.5 h-3.5" />
          Contact Support
        </a>
      </p>
    </div>
  );
}

export { ForgotPasswordPage };
export default ForgotPasswordPage;
