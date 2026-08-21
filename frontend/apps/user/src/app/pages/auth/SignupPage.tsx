import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {
  getPasswordRequirements,
  SignupRequestSchema,
  type SignupRequest,
} from "@edumind/shared-types";
import { getPasswordStrength, USER_ROUTES } from "@edumind/shared-utils";
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import {
  Button,
  Input,
  PasswordInput,
  Card,
  CardBody
} from "@edumind/user-ui";
import { Mail, User, CheckCircle } from "lucide-react";
import { AuthErrorSummary } from "./components/AuthErrorSummary";

export const SignupPage = () => {
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [localError, setLocalError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [passwordRequirementAnnouncement, setPasswordRequirementAnnouncement] = useState("");
  const validationAnnouncementTimerRef = useRef<number | null>(null);
  const passwordAnnouncementTimerRef = useRef<number | null>(null);
  const previousPasswordRequirementsRef = useRef<ReturnType<typeof getPasswordRequirements> | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupRequest>({
    resolver: zodResolver(SignupRequestSchema),
  });

  const password = watch("password", "");
  const passwordStrength = password ? getPasswordStrength(password) : null;
  const passwordRequirements = getPasswordRequirements(password);
  const validationMessages = [
    errors.username?.message,
    errors.email?.message,
    errors.password?.message,
  ].filter((message): message is string => Boolean(message));

  useEffect(() => {
    if (error || localError) {
      errorSummaryRef.current?.focus();
    }
  }, [error, localError]);

  useEffect(() => {
    if (success) {
      successHeadingRef.current?.focus();
    }
  }, [success]);

  useEffect(() => () => {
    if (validationAnnouncementTimerRef.current !== null) {
      window.clearTimeout(validationAnnouncementTimerRef.current);
    }
    if (passwordAnnouncementTimerRef.current !== null) {
      window.clearTimeout(passwordAnnouncementTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const previousRequirements = previousPasswordRequirementsRef.current;
    previousPasswordRequirementsRef.current = passwordRequirements;

    if (!password || !previousRequirements) {
      if (passwordAnnouncementTimerRef.current !== null) {
        window.clearTimeout(passwordAnnouncementTimerRef.current);
        passwordAnnouncementTimerRef.current = null;
      }
      setPasswordRequirementAnnouncement("");
      return;
    }

    const changedRequirements = passwordRequirements.filter(
      (requirement, index) => requirement.met !== previousRequirements[index]?.met,
    );
    if (changedRequirements.length === 0) return;

    if (passwordAnnouncementTimerRef.current !== null) {
      window.clearTimeout(passwordAnnouncementTimerRef.current);
    }
    passwordAnnouncementTimerRef.current = window.setTimeout(() => {
      setPasswordRequirementAnnouncement(
        changedRequirements
          .map((requirement) => `${requirement.label}: ${requirement.met ? "met" : "not met"}`)
          .join(". "),
      );
      passwordAnnouncementTimerRef.current = null;
    }, 300);
  }, [password]);

  const onSubmit = async (data: SignupRequest) => {
    setValidationAnnouncement("");
    clearError();
    setLocalError("");

    try {
      await signup(data);
      setSuccess(true);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to create account. Please try again.";
      setLocalError(errorMsg);
    }
  };

  const onInvalid = (invalidErrors: FieldErrors<SignupRequest>) => {
    clearError();
    setLocalError("");
    setValidationAnnouncement("");
    if (validationAnnouncementTimerRef.current !== null) {
      window.clearTimeout(validationAnnouncementTimerRef.current);
    }
    const messages = [
      invalidErrors.username?.message,
      invalidErrors.email?.message,
      invalidErrors.password?.message,
    ].filter((message): message is string => typeof message === "string");
    validationAnnouncementTimerRef.current = window.setTimeout(() => {
      setValidationAnnouncement(
        `${messages.length} ${messages.length === 1 ? "error" : "errors"}. ${messages.join(". ")}`,
      );
      validationAnnouncementTimerRef.current = null;
    }, 300);
  };

  const handleOAuth2Login = (provider: "google" | "facebook") => {
    const url =
      provider === "google"
        ? authService.getGoogleOAuthUrl()
        : authService.getFacebookOAuthUrl();
    window.location.href = url;
  };

  if (success) {
    return (
      <div className="max-w-md w-full mx-auto">
        <Card className="text-center">
          <CardBody>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1
              ref={successHeadingRef}
              tabIndex={-1}
              aria-describedby="signup-success-message"
              className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
            >
              Account Created!
            </h1>
            <p id="signup-success-message" className="mb-6 text-gray-600">
              Please check your email to verify your account before signing in.
            </p>
            <Link
              to={USER_ROUTES.LOGIN}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Go to Sign In
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Create Account
        </h1>
        <p className="text-gray-600">Join EduMind to start learning</p>
      </div>

      {/* Form Card */}
      <Card>
        <CardBody>
          {/* Error Alert */}
          {validationAnnouncement && (
            <p className="sr-only" role="alert" aria-atomic="true">
              {validationAnnouncement}
            </p>
          )}
          {(validationMessages.length > 0 || error || localError) && (
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
                ) : (error || localError)
              }
              className="mb-6"
            />
          )}

          {/* OAuth2 Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleOAuth2Login("google")}
              leftIcon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              }
            >
              Continue with Google
            </Button>

            {/* <Button
              variant="outline"
              fullWidth
              onClick={() => handleOAuth2Login("facebook")}
              leftIcon={
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
            >
              Continue with Facebook
            </Button> */}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            {/* Username */}
            <Input
              id="signup-username"
              type="text"
              label="Username"
              placeholder="e.g. lucas"
              leftIcon={<User className="w-5 h-5" />}
              error={errors.username?.message}
              fullWidth
              required
              autoComplete="username"
              {...register("username")}
            />

            {/* Email */}
            <Input
              id="signup-email"
              label="Email"
              type="email"
              placeholder="your.email@example.com"
              leftIcon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              fullWidth
              required
              autoComplete="email"
              {...register("email")}
            />

            {/* Password with Strength Indicator */}
            <div>
              <PasswordInput
                id="signup-password"
                label="Password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                fullWidth
                required
                autoComplete="new-password"
                aria-describedby="signup-password-requirements"
                {...register("password")}
              />

              <div id="signup-password-requirements" className="mt-2">
                <p className="text-sm font-medium text-gray-700">Password requirements:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {passwordRequirements.map((requirement) => (
                    <li
                      key={requirement.id}
                      className={requirement.met ? "text-green-700" : "text-gray-600"}
                    >
                      <span aria-hidden="true" className="mr-2">
                        {requirement.met ? "✓" : "×"}
                      </span>
                      {requirement.label} — {requirement.met ? "met" : "not met"}
                    </li>
                  ))}
                </ul>
              </div>
              <p
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="password-requirement-status"
              >
                {passwordRequirementAnnouncement}
              </p>

              {/* Password Strength */}
              {passwordStrength && (
                <div className="mt-2" role="status" aria-label={`Password strength: ${passwordStrength.label}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        aria-hidden="true"
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.color === "red"
                            ? "bg-red-500"
                            : passwordStrength.color === "yellow"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.color === "red"
                          ? "text-red-600"
                          : passwordStrength.color === "yellow"
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      Strength: {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
              <Link
                to={USER_ROUTES.LOGIN}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default SignupPage;
