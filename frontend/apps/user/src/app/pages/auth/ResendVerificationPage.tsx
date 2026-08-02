import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle, Mail } from "lucide-react";
import {
  ResendVerificationRequestSchema,
  type ResendVerificationRequest,
} from "@edumind/shared-types";
import { USER_ROUTES } from "@edumind/shared-utils";
import { Button, Card, CardBody, Input } from "@edumind/user-ui";
import { authService } from "../../services/auth.service";
import { AuthErrorSummary } from "./components/AuthErrorSummary";
import { AuthBackLink } from "./components/AuthBackLink";

export const ResendVerificationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationRequest>({
    resolver: zodResolver(ResendVerificationRequestSchema),
  });

  useEffect(() => {
    if (submittedEmail) successHeadingRef.current?.focus();
  }, [submittedEmail]);

  useEffect(() => {
    if (error) errorSummaryRef.current?.focus();
  }, [error]);

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
            <h1
              ref={successHeadingRef}
              tabIndex={-1}
              aria-describedby="resend-verification-success-message"
              className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
            >
              Check Your Email
            </h1>
            <p
              id="resend-verification-success-message"
              className="text-gray-600 mb-6"
            >
              If an unverified account exists for {submittedEmail}, a new verification link has been sent.
            </p>
            <AuthBackLink to={USER_ROUTES.LOGIN}>
              Back to Sign In
            </AuthBackLink>
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
            <AuthErrorSummary
              ref={errorSummaryRef}
              title="Unable to resend email"
              message={error}
              className="mb-6"
            />
          )}
          <p className="text-sm text-gray-600 mb-6">
            Enter the email address you used to create your account.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
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
            <AuthBackLink to={USER_ROUTES.LOGIN} />
          </div>
      </div>
    </div>
  );
};

export default ResendVerificationPage;
