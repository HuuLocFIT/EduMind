import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Mail, GraduationCap, HelpCircle } from "lucide-react";
import { authService } from '../../services/auth.service';

import { Button, Card, Alert, useToast } from "@edumind/user-ui";
import { USER_ROUTES } from "@edumind/shared-utils";

function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const { success, error: showError } = useToast();

  // Use ref to prevent duplicate verification calls in Strict Mode
  const hasVerifiedRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent duplicate verification in Strict Mode
    if (hasVerifiedRef.current) {
      return;
    }

    if (token) {
      hasVerifiedRef.current = true;
      verifyEmail(token);
    } else {
      setIsVerifying(false);
      setError("No verification token provided");
    }

    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      await authService.verifyEmail(verificationToken);
      setIsSuccess(true);
      success("Your email has been verified successfully!", "Success");
      // Redirect to login after 3 seconds
      redirectTimeoutRef.current = setTimeout(() => {
        navigate(USER_ROUTES.LOGIN);
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        "Email verification failed. The link may have expired.";
      setError(errorMessage);
      showError(errorMessage, "Verification Failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    const email = prompt("Please enter your email address:");
    if (!email) return;

    setResending(true);
    try {
      await authService.resendVerification({ email });
      success("Verification email sent! Check your inbox.", "Email Sent");
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to resend verification email";
      showError(errorMessage, "Error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-2">
        <GraduationCap className="w-16 h-16 text-blue-600" />
        <span className="text-4xl font-bold text-gray-900">EduMind</span>
      </div>

      <Card variant="elevated" padding="lg">
        {/* Verifying State */}
        {isVerifying && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Verifying Email...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        )}

        {/* Success State */}
        {!isVerifying && isSuccess && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now access all
              features.
            </p>

            <Alert
              variant="success"
              message="Redirecting to login in 3 seconds..."
            />

            <div className="mt-6">
              <Link to={USER_ROUTES.LOGIN}>
                <Button variant="primary" fullWidth>
                  Continue to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isVerifying && !isSuccess && error && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>

            <div className="space-y-3">
              <Alert
                variant="error"
                message="The verification link may have expired or is invalid."
              />

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Need a new verification link?
                </p>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleResendVerification}
                  isLoading={resending}
                  leftIcon={<Mail className="w-4 h-4" />}
                >
                  Resend Verification Email
                </Button>
              </div>

              <Link to={USER_ROUTES.LOGIN}>
                <Button variant="ghost" fullWidth>
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* No Token State */}
        {!isVerifying && !token && (
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Email Verification Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your email for the verification link.
            </p>

            <Alert
              variant="info"
              message="If you didn't receive the email, check your spam folder or request a new one."
            />

            <div className="mt-6 space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleResendVerification}
                isLoading={resending}
              >
                Resend Verification Email
              </Button>

              <Link to={USER_ROUTES.LOGIN}>
                <Button variant="ghost" fullWidth>
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

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

export { EmailVerificationPage };
export default EmailVerificationPage;
