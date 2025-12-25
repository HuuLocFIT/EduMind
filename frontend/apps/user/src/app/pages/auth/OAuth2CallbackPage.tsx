import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from '../../stores/auth.store';
import { useToast } from "@edumind/user-ui";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useRef } from "react";

/**
 * OAuth2 Callback Page
 * 
 * Handles redirect from OAuth2 provider after successful authentication.
 * 
 * Flow:
 * 1. Backend redirects to /oauth2/redirect?token=<accessToken>
 * 2. refreshToken is already set in HTTP-Only Cookie by backend
 * 3. This page extracts accessToken from URL and stores it
 * 4. Redirects to dashboard
 */
export const OAuth2CallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth2 } = useAuthStore();
  const {
    success: showSuccess,
    error: showError,
  } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const hasHandled = useRef(false); // prevent double-run in React StrictMode

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;

    const handleOAuth2Callback = async () => {
      try {
        // Get access token from query params (sent by backend)
        // Note: refreshToken is in HTTP-Only Cookie (not in URL)
        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
          showError(`OAuth2 authentication failed: ${error}`);
          navigate(USER_ROUTES.LOGIN);
          return;
        }

        if (!token) {
          showError("No token received from OAuth2 provider");
          navigate(USER_ROUTES.LOGIN);
          return;
        }

        // Use auth store method to handle OAuth2 login
        // This stores accessToken and fetches user info
        await loginWithOAuth2(token);

        // Clean URL (remove token from address bar)
        window.history.replaceState({}, '', USER_ROUTES.DASHBOARD);

        showSuccess("Successfully logged in!");
        navigate(USER_ROUTES.DASHBOARD);
      } catch (err: any) {
        console.error("OAuth2 callback error:", err);
        const errorMessage = err?.message || "OAuth2 authentication failed";
        showError(errorMessage);
        navigate(USER_ROUTES.LOGIN);
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuth2Callback();
  }, [searchParams, navigate, loginWithOAuth2, showSuccess, showError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isProcessing ? "Completing authentication..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default OAuth2CallbackPage;