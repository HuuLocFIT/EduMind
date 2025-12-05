import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@user/stores/auth.store";
import { ToastContainer, useToast } from "@edumind/user-ui";
import { USER_ROUTES } from "@edumind/shared-utils";

export const OAuth2CallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth2 } = useAuthStore();
  const {
    success: showSuccess,
    error: showError,
    toasts,
    closeToast,
  } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      try {
        // Get token from query params (sent by backend)
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
        await loginWithOAuth2(token);

        showSuccess("Successfully logged in with OAuth2!");
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
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isProcessing ? "Completing authentication..." : "Redirecting..."}
          </p>
        </div>
      </div>
    </>
  );
};

export default OAuth2CallbackPage;
