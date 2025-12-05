import React, { useEffect, useRef, useState } from "react";
import { Card, Button, Input, useToast, ToastContainer } from "@edumind/user-ui";
import type { User } from "@edumind/shared-types";
import AuthService from "@user/services/auth.service";

interface ProfileTabProps {
  user: User | null;
  updateUser: (user: User) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, updateUser }) => {
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    username: user?.username || "",
    phoneNumber: user?.phoneNumber || "",
    profilePictureUrl: user?.profilePictureUrl || "",
  });
  const { toasts, success: showSuccess, error: showError, closeToast } = useToast();

  useEffect(() => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
      phoneNumber: user?.phoneNumber || "",
      profilePictureUrl: user?.profilePictureUrl || "",
    });
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadResult = await AuthService.uploadProfileImage(file);
      setFormData((prev) => ({
        ...prev,
        profilePictureUrl: uploadResult.url,
      }));
      showSuccess("Avatar uploaded successfully!");
    } catch (err: any) {
      showError(err?.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, string> = {};

    if (formData.firstName.trim()) {
      payload['firstName'] = formData.firstName.trim();
    }

    if (formData.lastName.trim()) {
      payload['lastName'] = formData.lastName.trim();
    }

    if (formData.phoneNumber.trim()) {
      payload['phoneNumber'] = formData.phoneNumber.trim();
    }

    if (formData.profilePictureUrl) {
      payload['profilePictureUrl'] = formData.profilePictureUrl; 
    }

    if (Object.keys(payload).length === 0) {
      showError("No changes to update");
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await AuthService.updateProfile(payload);
      updateUser(updatedUser);
      showSuccess("Profile updated successfully!");
    } catch (err: any) {
      showError(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Profile Information
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex items-center gap-6">
            {formData.profilePictureUrl ? (
              <img
                src={formData.profilePictureUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-semibold">
                {user?.firstName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div>
              <Button
                variant="secondary"
                type="button"
                onClick={handleAvatarSelect}
                isLoading={avatarUploading}
              >
                {formData.profilePictureUrl ? "Change Avatar" : "Upload Avatar"}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG or GIF. Max size 2MB
              </p>
            </div>
          </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <Input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <Input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <Input type="text" name="username" value={formData.username} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input type="email" name="email" value={formData.email} disabled />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <Input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
        </div>

          <div className="flex items-center gap-4 pt-4">
            <Button type="submit" variant="primary" isLoading={loading}>
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setFormData({
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
                  email: user?.email || "",
                  username: user?.username || "",
                  phoneNumber: user?.phoneNumber || "",
                  profilePictureUrl: user?.profilePictureUrl || "",
                })
              }
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
};
