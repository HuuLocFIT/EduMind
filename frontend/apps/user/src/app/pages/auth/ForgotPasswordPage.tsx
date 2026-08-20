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

export const RESEND_COOLDOWN_SECONDS = 60;

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const validationAnnouncementTimerRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (cooldownIntervalRef.current !== null) {
      window.clearInterval(cooldownIntervalRef.current);
    }
  }, []);

  // Resets the live region to "" first, then sets the real message on a
  // later microtask so `aria-atomic` consumers see an actual change even
  // when the new text is identical to what's already displayed.
  const announceResendStatus = (message: string) => {
    setResendMessage("");
    queueMicrotask(() => setResendMessage(message));
  };

  const startCooldown = () => {
    if (cooldownIntervalRef.current !== null) {
      window.clearInterval(cooldownIntervalRef.current);
    }
    setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current !== null) {
            window.clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          announceResendStatus("Resend Email is now available");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setValidationAnnouncement("");
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(data);
      setEmailSent(true);
      startCooldown();
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
    if (!email || isLoading || cooldownRemaining > 0) return;

    setIsLoading(true);
    setError("");
    setResendMessage("");
    try {
      await authService.forgotPassword({ email });
      announceResendStatus(
        `Reset email sent again. You can resend in ${RESEND_COOLDOWN_SECONDS} seconds.`,
      );
      startCooldown();
    } catch (error: any) {
      setError(error?.message || "Failed to resend email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    const isCoolingDown = cooldownRemaining > 0;

    return (
      <Card variant="elevated" padding="lg" className="max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          {/*
            The heading and this paragraph are born together in the same
            render (this whole branch only exists once emailSent flips true),
            so a passive role="status" live region here is unreliable: VO/
            Safari generally only announces a *mutation* on a node that
            already existed, not a node that shows up already populated.
            aria-describedby, by contrast, is recomputed synchronously at the
            moment focus lands - moving focus to the heading (below) makes VO
            read the heading name and this description together in one
            utterance, regardless of both being freshly mounted.

            role="text" (a non-standard but WebKit-supported role) is used
            instead of role="status" for a second reason: with a plain <p>,
            the inline <span> for {email} makes VoiceOver's linear (VO+Right
            Arrow) navigation stop at the span as a separate item, splitting
            "We've sent password reset instructions to" from the email into
            two announcements. role="text" tells VoiceOver to flatten this
            node's subtree into a single static-text object read as one
            utterance. Non-WebKit browsers simply don't recognize "text" and
            fall back to default paragraph semantics - harmless there.
          */}
          <h1
            ref={confirmationHeadingRef}
            tabIndex={-1}
            aria-describedby="reset-confirmation-detail"
            className="text-2xl font-bold text-gray-800 mb-2 focus:outline-none"
          >
            Check Your Email
          </h1>
          <p id="reset-confirmation-detail" role="text" className="text-gray-600 mb-6">
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
            {/*
              Always mounted (never conditionally rendered) so this stays the
              SAME DOM node across the whole confirmation view. VoiceOver/
              Safari does not reliably announce a role="status" element that
              is born already populated with text in the same render pass —
              it only picks up mutations on a node that already existed.
              Visually hidden via sr-only (not display:none/unmounting) while
              empty, since sr-only keeps the node in the accessibility tree.
            */}
            <p
              role="status"
              aria-atomic="true"
              className={resendMessage ? "text-sm text-green-700" : "sr-only"}
            >
              {resendMessage}
            </p>

            <div className="pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the email?
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleResend}
                isLoading={isLoading}
                aria-disabled={isCoolingDown || undefined}
                aria-describedby={isCoolingDown ? "resend-cooldown-hint" : undefined}
                className={isCoolingDown ? "opacity-50 cursor-not-allowed" : undefined}
                fullWidth
              >
                Resend Email
              </Button>
              {isCoolingDown && (
                <p id="resend-cooldown-hint" className="text-sm text-gray-600 mt-2">
                  <span aria-hidden="true">Resend available in {cooldownRemaining}s</span>
                  <span className="sr-only">Resend available in {cooldownRemaining} seconds</span>
                </p>
              )}
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
