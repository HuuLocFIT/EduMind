import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Shield, ArrowLeft, Key } from "lucide-react";
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { USER_ROUTES } from "@edumind/shared-utils";
import {
  Button,
  Card,
  CardBody,
  Alert,
  useToast,
} from "@edumind/user-ui";

interface RecoveryFormData {
  backupCode: string;
}

export const TwoFactorRecoveryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWith2FA } = useAuthStore();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  // Get login data from location state (passed from LoginPage)
  const loginData = location.state?.loginData as
    | { usernameOrEmail: string; password: string }
    | null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoveryFormData>({
    defaultValues: {
      backupCode: "",
    },
  });

  const backupCodeInputRef = useRef<HTMLInputElement | null>(null);
  const { ref: backupCodeRegisterRef, ...backupCodeRegisterRest } = register(
    "backupCode",
    {
      required: "Backup code is required",
      pattern: {
        value: /^[A-Z0-9]{8}$/,
        message: "Backup code must be 8 characters (letters and numbers)",
      },
    }
  );

  useEffect(() => {
    backupCodeInputRef.current?.focus();
  }, []);

  const onSubmit = async (data: RecoveryFormData) => {
    if (!loginData) {
      showError("Login data not found. Please try logging in again.", "Error");
      navigate(USER_ROUTES.LOGIN);
      return;
    }

    setLoading(true);
    try {
      // Use backup code as the 2FA code
      await loginWith2FA({
        usernameOrEmail: loginData.usernameOrEmail,
        password: loginData.password,
        code: data.backupCode,
      });

      success("Login successful!", "Success");
      setTimeout(() => {
        navigate(USER_ROUTES.DASHBOARD);
      }, 500);
    } catch (err: any) {
      showError(
        // apiClient rejects with a flat ApiError — `.response` only exists on raw AxiosErrors.
        err.message || err.response?.data?.message || "Invalid backup code",
        "Verification Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // If no login data, redirect to login
  if (!loginData) {
    return (
      <div className="max-w-md w-full mx-auto">
        <Card>
          <CardBody>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Login Required
              </h2>
              <p className="text-gray-600 mb-6">
                Please log in first to use a backup code.
              </p>
              <Link to={USER_ROUTES.LOGIN}>
                <Button variant="primary" fullWidth>
                  Go to Login
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Use Backup Code
        </h1>
        <p className="text-gray-600">
          Enter one of your backup codes to access your account
        </p>
      </div>

      <Card>
        <CardBody>
          <Alert
            variant="info"
            title="Backup Code"
            message="Each backup code can only be used once. After using a code, it will be invalidated."
            className="mb-6"
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="backup-code" className="block text-sm font-medium text-gray-700 mb-2">
                Backup Code
              </label>
              <input
                id="backup-code"
                type="text"
                placeholder="Enter backup code"
                {...backupCodeRegisterRest}
                ref={(el) => {
                  backupCodeRegisterRef(el);
                  backupCodeInputRef.current = el;
                }}
                className={`w-full px-4 py-3 border rounded-lg text-center text-lg tracking-wider font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                  errors.backupCode ? "border-red-500" : "border-gray-300"
                }`}
                maxLength={8}
                autoComplete="off"
              />
              {errors.backupCode && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.backupCode.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
              >
                Verify & Login
              </Button>

              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => navigate(USER_ROUTES.LOGIN)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Login
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 text-center">
              Don't have a backup code?{" "}
              <Link
                to={USER_ROUTES.PROFILE_SETTINGS}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Settings
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TwoFactorRecoveryPage;

