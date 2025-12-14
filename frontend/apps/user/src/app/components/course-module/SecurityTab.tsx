import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Card,
  Button,
  Modal,
  PasswordInput,
  Input,
  useToast,
} from "@edumind/user-ui";
import type { User } from "@edumind/shared-types";
import { Shield, Trash2, Settings } from "lucide-react";
import { authService } from "@user/services/index";
import { useAuthStore } from "@user/stores/auth.store";
import { USER_ROUTES } from "@edumind/shared-utils";

interface SecurityTabProps {
  user: User | null;
}

interface Disable2FAFormData {
  password: string;
  code: string;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  const navigate = useNavigate();
  const { user: currentUser, setUser, clearAuthState } = useAuthStore();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    register: registerDisable,
    handleSubmit: handleSubmitDisable,
    formState: { errors: disableErrors },
    reset: resetDisable,
  } = useForm<Disable2FAFormData>({
    defaultValues: {
      password: "",
      code: "",
    },
  });

  const handleEnable2FA = () => {
    navigate(USER_ROUTES.TWO_FA_SETUP);
  };

  const handleManage2FA = () => {
    setShowDisableModal(true);
  };

  const onDisable2FA = async (data: Disable2FAFormData) => {
    setLoading(true);
    try {
      await authService.disable2FA({
        password: data.password,
        code: data.code,
      });

      // Refresh user data
      const updatedUser = await authService.fetchCurrentUser();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      success("2FA disabled successfully!", "Success");
      setShowDisableModal(false);
      resetDisable();
    } catch (err: any) {
      showError(
        err.response?.data?.message || "Failed to disable 2FA",
        "Error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const onConfirmDeleteAccount = async () => {
    if (deleteConfirmText !== "Delete") {
      showError("Please type 'Delete' to confirm", "Invalid Confirmation");
      return;
    }

    setLoading(true);

    try {
      await authService.deleteAccount();
      
      // Clear auth store state immediately to prevent re-render loops
      // Don't call logout API since account is already deleted
      clearAuthState();
      
      success("Account deleted successfully", "Success");
      
      // Redirect immediately using replace to prevent back navigation
      // Use setTimeout to ensure state update completes before redirect
      setTimeout(() => {
        window.location.replace("/");
      }, 300);
    } catch (err: any) {
      showError(
        err.response?.data?.message || "Failed to delete account",
        "Error"
      );
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Two-Factor Authentication
            </h3>
            <p className="text-gray-600">
              Add an extra layer of security to your account
            </p>
            <div className="mt-4">
              {user?.is2faEnabled ? (
                <span className="inline-flex items-center gap-2 text-green-600 font-medium">
                  <Shield className="w-5 h-5" />
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-gray-500">
                  <Shield className="w-5 h-5" />
                  Disabled
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {user?.is2faEnabled ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleManage2FA}
                  leftIcon={<Settings className="w-4 h-4" />}
                >
                  Manage
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={handleEnable2FA}
                leftIcon={<Shield className="w-4 h-4" />}
              >
                Enable
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
        <p className="text-gray-600 mb-4">
          Manage your active sessions across different devices
        </p>

        {/* Current Session */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">Current Device</p>
              <p className="text-sm text-gray-600 mt-1">
                {navigator.userAgent.includes("Windows")
                  ? "Windows"
                  : navigator.userAgent.includes("Mac")
                  ? "macOS"
                  : navigator.userAgent.includes("Linux")
                  ? "Linux"
                  : "Unknown"}{" "}
                •{" "}
                {navigator.userAgent.includes("Chrome")
                  ? "Chrome"
                  : navigator.userAgent.includes("Firefox")
                  ? "Firefox"
                  : navigator.userAgent.includes("Safari")
                  ? "Safari"
                  : "Unknown Browser"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last active: Just now
              </p>
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Active
            </span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200">
        <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>

        <div className="space-y-4">
          <div className="flex items-start justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Delete Account</h4>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleDeleteAccount}
              isLoading={loading}
              className="bg-red-600 text-white hover:bg-red-700 border-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Disable 2FA Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => {
          setShowDisableModal(false);
          resetDisable();
        }}
        title="Disable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            To disable 2FA, please enter your password and a verification code
            from your authenticator app.
          </p>

          <form
            onSubmit={handleSubmitDisable(onDisable2FA)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <PasswordInput
                placeholder="Enter your password"
                error={disableErrors.password?.message}
                fullWidth
                {...registerDisable("password", {
                  required: "Password is required",
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <Input
                type="text"
                placeholder="000000"
                error={disableErrors.code?.message}
                fullWidth
                className="text-center text-xl tracking-widest font-mono"
                maxLength={6}
                {...registerDisable("code", {
                  required: "Verification code is required",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Code must be 6 digits",
                  },
                })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code from your authenticator app or a backup
                code
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowDisableModal(false);
                  resetDisable();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                fullWidth
                isLoading={loading}
              >
                Disable 2FA
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText("");
        }}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ Warning: This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              This will permanently delete your account and all associated data,
              including:
            </p>
            <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
              <li>Your profile and personal information</li>
              <li>All course enrollments and progress</li>
              <li>Your reviews and ratings</li>
              <li>All other account-related data</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono font-bold">Delete</span> to
              confirm
            </label>
            <Input
              type="text"
              placeholder="Delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              fullWidth
              className="font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Please type the word "Delete" exactly as shown to confirm this
              action
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              onClick={onConfirmDeleteAccount}
              isLoading={loading}
              disabled={deleteConfirmText !== "Delete" || loading}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
