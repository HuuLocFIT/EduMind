import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LoginRequestSchema,
  type LoginRequest,
  type TwoFactorLoginRequest,
} from "@edumind/shared-types";
import { authService } from "@user/services/index";
import { useAuthStore } from "@user/stores/auth.store";
import { USER_ROUTES } from "@edumind/shared-utils";
import {
  Button,
  Input,
  PasswordInput,
  Alert,
  Card,
  CardBody,
  useToast,
} from "@edumind/user-ui";
import { Shield, User } from "lucide-react";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWith2FA, isLoading, error, clearError } = useAuthStore();
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loginData, setLoginData] = useState<LoginRequest | null>(null);
  const [localError, setLocalError] = useState<string>("");
  const { success: showSuccess, error: showError } = useToast();

  // Success message from signup or email verification
  const successMessage = location.state?.message;

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
  });

  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    formState: { errors: twoFAErrors },
  } = useForm<{ code: string }>({
    defaultValues: {
      code: "",
    },
  });

  const onLoginSubmit = async (data: LoginRequest) => {
    clearError();
    setLocalError("");

    try {
      await login(data);
      showSuccess("Login successful!");

      setTimeout(() => {
        navigate(USER_ROUTES.DASHBOARD);
      }, 500);
    } catch (err: any) {
      // Check if 2FA is required
      if (
        err.requires2FA === true ||
        err.message?.includes("Two-factor authentication required")
      ) {
        setNeeds2FA(true);
        setLoginData(data);
        setLocalError("");
        // Don't show error toast for 2FA requirement
      } else {
        const errorMsg = err.message || "Invalid email or password";
        setLocalError(errorMsg);
        showError("Login failed. Please check your credentials.");
      }
    }
  };

  const on2FASubmit = async (data: { code: string }) => {
    if (!loginData) return;

    clearError();
    setLocalError("");

    try {
      const twoFactorData: TwoFactorLoginRequest = {
        usernameOrEmail: loginData.usernameOrEmail,
        password: loginData.password,
        code: data.code,
      };

      await loginWith2FA(twoFactorData);
      showSuccess("2FA verification successful!");

      setTimeout(() => {
        navigate(USER_ROUTES.DASHBOARD);
      }, 500);
    } catch (err: any) {
      const errorMsg = err.message || "Invalid 2FA code";
      setLocalError(errorMsg);
      showError("2FA verification failed");
    }
  };

  const handleOAuth2Login = (provider: "google" | "facebook") => {
    const url =
      provider === "google"
        ? authService.getGoogleOAuthUrl()
        : authService.getFacebookOAuthUrl();
    window.location.href = url;
  };

  const handleBack = () => {
    setNeeds2FA(false);
    setLoginData(null);
    setLocalError("");
    clearError();
  };

  return (
    <div className="max-w-md w-full mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {needs2FA ? "Two-Factor Authentication" : "Welcome Back"}
        </h1>
        <p className="text-gray-600">
          {needs2FA
            ? "Enter the 6-digit code from your authenticator app"
            : "Sign in to your EduMind account"}
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardBody>
          {/* Success Message */}
          {successMessage && !needs2FA && (
            <Alert
              variant="success"
              title="Success"
              message={successMessage}
              className="mb-6"
            />
          )}

          {/* Error Alert */}
          {(error || localError) && (
            <Alert
              variant="error"
              title="Error"
              message={error || localError}
              className="mb-6"
            />
          )}

          {needs2FA ? (
            // ========== 2FA CODE FORM ==========
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <form
                onSubmit={handleSubmit2FA(on2FASubmit)}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    placeholder="000000"
                    {...register2FA("code", {
                      required: "2FA code is required",
                      pattern: {
                        value: /^\d{6}$/,
                        message: "Code must be 6 digits",
                      },
                    })}
                    className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      twoFAErrors.code ? "border-red-500" : "border-gray-300"
                    }`}
                    maxLength={6}
                    autoFocus
                  />
                  {twoFAErrors.code && (
                    <p className="mt-2 text-sm text-red-600 text-center">
                      {twoFAErrors.code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Verify & Login
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={handleBack}
                  >
                    Back to Login
                  </Button>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Can't access your authenticator app?{" "}
                <Link
                  to={USER_ROUTES.TWO_FA_RECOVERY}
                  state={{ loginData }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Use backup code
                </Link>
              </p>
            </>
          ) : (
            // ========== NORMAL LOGIN FORM ==========
            <>
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

                <Button
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
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form
                onSubmit={handleSubmitLogin(onLoginSubmit)}
                className="space-y-4"
              >
                {/* Email */}
                <Input
                  label="Username or Email"
                  type="text"
                  placeholder="e.g. lucas or lucas@email.com"
                  leftIcon={<User className="w-5 h-5" />}
                  error={loginErrors.usernameOrEmail?.message}
                  fullWidth
                  {...registerLogin("usernameOrEmail")}
                />

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <Link
                      to={USER_ROUTES.FORGOT_PASSWORD}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <PasswordInput
                    placeholder="••••••••"
                    error={loginErrors.password?.message}
                    fullWidth
                    {...registerLogin("password")}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isLoading}
                >
                  Sign In
                </Button>
              </form>

              {/* Signup Link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to={USER_ROUTES.SIGNUP}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </Link>
              </p>
            </>
          )}
        </CardBody>
      </Card>

      {/* Email Verification Notice */}
      {!needs2FA && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Haven't verified your email?{" "}
          <Link
            to={USER_ROUTES.RESEND_VERIFICATION}
            className="text-blue-600 hover:text-blue-700"
          >
            Resend verification email
          </Link>
        </p>
      )}
    </div>
  );
};

export default LoginPage;
