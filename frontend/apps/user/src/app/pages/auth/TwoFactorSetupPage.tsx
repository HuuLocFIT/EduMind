import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Copy, Check, Download, ArrowLeft, QrCode } from "lucide-react";
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { USER_ROUTES } from "@edumind/shared-utils";
import { Button, Card, CardBody, Alert, useToast } from "@edumind/user-ui";
import {
  Verify2FACodeRequestSchema,
  type Verify2FACodeRequest,
  type Setup2FAResponse,
} from "@edumind/shared-types";

export const TwoFactorSetupPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [currentStep, setCurrentStep] = useState<"scan" | "verify">("scan");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Verify2FACodeRequest>({
    resolver: zodResolver(Verify2FACodeRequestSchema),
  });

  const verifyCodeInputRef = useRef<HTMLInputElement | null>(null);
  const { ref: verifyCodeRegisterRef, ...verifyCodeRegisterRest } =
    register("code");

  useEffect(() => {
    if (currentStep === "verify") {
      verifyCodeInputRef.current?.focus();
    }
  }, [currentStep]);

  useEffect(() => {
    // Don't redirect if we're showing backup codes or currently verifying
    if (showBackupCodes || loading) {
      return;
    }

    // If 2FA is already enabled, redirect to settings
    // But only if we're not in the middle of setup process
    if (user?.is2faEnabled && setupData) {
      // User already has 2FA enabled and we have setup data
      // This means they came here but 2FA is already enabled
      navigate(USER_ROUTES.PROFILE_SETTINGS);
      return;
    }

    // Load setup data only if we don't have it yet and user doesn't have 2FA enabled
    if (!setupData && !user?.is2faEnabled) {
      loadSetupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showBackupCodes, loading]);

  const loadSetupData = async () => {
    setLoading(true);
    try {
      const data = await authService.setup2FA();
      setSetupData(data);
    } catch (err: any) {
      showError(
        // apiClient rejects with a flat ApiError — `.response` only exists on raw AxiosErrors.
        err.message || err.response?.data?.message || "Failed to load 2FA setup data",
        "Error"
      );
      navigate(USER_ROUTES.PROFILE_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (data: Verify2FACodeRequest) => {
    if (!setupData) return;

    setLoading(true);
    try {
      await authService.verify2FASetup({
        code: data.code,
      });

      success("2FA enabled successfully!", "Success");
      setShowBackupCodes(true);
    } catch (err: any) {
      showError(
        err.message || err.response?.data?.message || "Invalid verification code",
        "Verification Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update user data when user clicks "Continue to Settings"
  const handleContinueToSettings = async () => {
    try {
      // Refresh user data before navigating
      const updatedUser = await authService.fetchCurrentUser();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Navigate to settings
      navigate(USER_ROUTES.PROFILE_SETTINGS, {
        state: { activeTab: "security", refreshUser: true },
      });
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      // Still navigate even if refresh fails
      navigate(USER_ROUTES.PROFILE_SETTINGS, {
        state: { activeTab: "security", refreshUser: true },
      });
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `EduMind 2FA Backup Codes\n\nSave these codes in a secure location. Each code can only be used once.\n\n${setupData.backupCodes.join(
      "\n"
    )}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumind-2fa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !setupData) {
    return (
      <div className="max-w-2xl w-full mx-auto">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Setting up 2FA...
              </h2>
              <p className="text-gray-600">Please wait</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!setupData) {
    return null;
  }

  if (showBackupCodes) {
    return (
      <div className="max-w-2xl w-full mx-auto p-6">
        <Card>
          <CardBody>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                2FA Enabled Successfully!
              </h2>
              <p className="text-gray-600">
                Save your backup codes in a secure location
              </p>
            </div>

            <Alert
              variant="warning"
              title="Important"
              message="These backup codes can be used to access your account if you lose access to your authenticator app. Each code can only be used once."
              className="mb-6"
            />

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Backup Codes</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBackupCodes}
                    leftIcon={
                      copiedCodes ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )
                    }
                  >
                    {copiedCodes ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBackupCodes}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                {setupData.backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded border text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleContinueToSettings}
              >
                Continue to Settings
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowBackupCodes(false)}
              >
                Back
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Enable Two-Factor Authentication
        </h1>
        <p className="text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === "scan"
                  ? "bg-blue-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              {currentStep === "scan" ? "1" : <Check className="w-5 h-5" />}
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep === "scan" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Scan QR Code
            </span>
          </div>
          <div className="h-0.5 w-16 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === "verify"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <span
              className={`text-sm font-medium ${
                currentStep === "verify" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Verify Code
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          {currentStep === "scan" ? (
            <>
              {/* Step 1 & 2: Scan QR Code and Manual Entry */}
              <div className="space-y-6">
                {/* Step 1: Scan QR Code */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Scan QR Code
                    </h2>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Open your authenticator app (Google Authenticator, Authy,
                    Microsoft Authenticator, etc.) and scan this QR code:
                  </p>

                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                      <img
                        src={setupData.qrCodeUrl}
                        alt="2FA QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>

                  <Alert
                    variant="info"
                    message="Can't scan? Use the secret key below to manually add the account."
                    className="mb-6"
                  />
                </div>

                {/* Step 2: Manual Entry */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Manual Entry (Optional)
                    </h2>
                  </div>
                  <p className="text-gray-600 mb-4">
                    If you can't scan the QR code, enter this secret key
                    manually in your authenticator app:
                  </p>

                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-sm font-mono text-gray-800 flex-1 break-all">
                        {setupData.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                        leftIcon={
                          copiedSecret ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedSecret ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() =>
                      navigate(USER_ROUTES.PROFILE_SETTINGS, {
                        state: { activeTab: "security", refreshUser: true },
                      })
                    }
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setCurrentStep("verify")}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 3: Verify */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Verify Setup
                  </h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Enter the 6-digit code from your authenticator app to verify
                  the setup:
                </p>

                <form onSubmit={handleSubmit(onVerify)} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="verify-2fa-code" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="verify-2fa-code"
                      type="text"
                      placeholder="000000"
                      {...verifyCodeRegisterRest}
                      ref={(el) => {
                        verifyCodeRegisterRef(el);
                        verifyCodeInputRef.current = el;
                      }}
                      className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.code ? "border-red-500" : "border-gray-300"
                      }`}
                      maxLength={6}
                    />
                    {errors.code && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.code.message}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Enter the code shown in your authenticator app
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      onClick={() => setCurrentStep("scan")}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={loading}
                    >
                      Verify & Enable 2FA
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default TwoFactorSetupPage;
