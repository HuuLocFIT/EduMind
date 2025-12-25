import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle, GraduationCap } from "lucide-react";

import {
  Button,
  Input,
  Alert,
  Card,
  useToast,
} from "@edumind/user-ui";
import { authService } from '../../services/auth.service';
import { USER_ROUTES } from "@edumind/shared-utils";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const email = watch("email");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(data);
      setEmailSent(true);
      success("Check your email for reset instructions", "Email Sent!");
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to send reset email. Please try again.";
      setError(errorMessage);
      showError(errorMessage, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      success("Reset email sent again", "Email Sent!");
    } catch (error: any) {
      showError("Failed to resend email", "Error");
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-600 mb-6">
            We've sent password reset instructions to{" "}
            <span className="font-semibold">{email}</span>
          </p>

          <div className="space-y-3">
            <Alert
              variant="info"
              message="The link will expire in 1 hour for security reasons."
            />

            <div className="pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                isLoading={isLoading}
                fullWidth
              >
                Resend Email
              </Button>
            </div>

            <Link to={USER_ROUTES.LOGIN}>
              <Button
                variant="ghost"
                fullWidth
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <GraduationCap className="w-16 h-16 text-blue-600" />
          <span className="text-4xl font-bold text-gray-900">EduMind</span>
        </div>
        <p className="text-gray-600">Reset your password</p>
      </div>

      {/* Forgot Password Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Forgot Password?
          </h2>
          <p className="text-sm text-gray-600">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4">
            <Alert
              variant="error"
              message={error}
              onClose={() => setError("")}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
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
          <Link
            to={USER_ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-6 text-center text-xs text-gray-500">
        Having trouble? Contact{" "}
        <a
          href="mailto:support@edumind.com"
          className="text-blue-600 hover:underline"
        >
          support@edumind.com
        </a>
      </p>
    </div>
  );
}
