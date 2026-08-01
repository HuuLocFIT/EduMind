import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import {
  ResendVerificationRequestSchema,
  type ResendVerificationRequest,
} from "@edumind/shared-types";
import { USER_ROUTES } from "@edumind/shared-utils";
import { Alert, Button, Card, CardBody, Input } from "@edumind/user-ui";
import { authService } from "../../services/auth.service";

export const ResendVerificationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationRequest>({
    resolver: zodResolver(ResendVerificationRequestSchema),
  });

  const onSubmit = async (data: ResendVerificationRequest) => {
    setIsSubmitting(true);
    setError("");

    try {
      await authService.resendVerification(data);
      setSubmittedEmail(data.email);
    } catch (requestError: any) {
      const errorMessage =
        requestError.message ||
        "Failed to resend the verification email. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="max-w-md w-full mx-auto">
        <Card>
          <CardBody className="text-center">
            <CheckCircle aria-hidden="true" className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              If an unverified account exists for {submittedEmail}, a new verification link has been sent.
            </p>
            <Link to={USER_ROUTES.LOGIN} className="font-medium text-blue-600 hover:text-blue-700">
              Back to Sign In
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Resend Verification Email</h1>
        <p className="text-gray-600">Request a new verification link</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <Alert variant="error" title="Unable to resend email" message={error} className="mb-6" />
          )}
          <p className="text-sm text-gray-600 mb-6">
            Enter the email address you used to create your account.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="your@email.com"
              leftIcon={<Mail aria-hidden="true" className="w-5 h-5" />}
              error={errors.email?.message}
              helperText="We'll send a new verification link to this email"
              fullWidth
              required
              {...register("email")}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
            >
              Resend Verification Email
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link
              to={USER_ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
      </div>
    </div>
  );
};

export default ResendVerificationPage;
