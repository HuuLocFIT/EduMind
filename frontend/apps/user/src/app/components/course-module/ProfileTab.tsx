import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, Button, Input, useToast } from "@edumind/user-ui";
import {
  type User,
  UpdateProfileRequestSchema,
  type UpdateProfileRequest,
} from "@edumind/shared-types";
import { authService, fileUploadService } from "@user/services/index";

interface ProfileTabProps {
  user: User | null;
  updateUser: (user: User) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, updateUser }) => {
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(UpdateProfileRequestSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || "",
      profilePictureUrl: user?.profilePictureUrl || "",
    },
  });

  const profilePictureUrl = watch("profilePictureUrl");

  useEffect(() => {
    reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || "",
      profilePictureUrl: user?.profilePictureUrl || "",
    });
  }, [user, reset]);

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
      const uploadResult = await fileUploadService.uploadImage(file);
      setValue("profilePictureUrl", uploadResult.url);
      showSuccess("Avatar uploaded successfully!");
    } catch (err: any) {
      showError(err?.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (data: UpdateProfileRequest) => {
    // Build payload with only non-empty values
    const payload: UpdateProfileRequest = {};

    if (data.firstName?.trim()) {
      payload.firstName = data.firstName.trim();
    }

    if (data.lastName?.trim()) {
      payload.lastName = data.lastName.trim();
    }

    if (data.phoneNumber?.trim()) {
      payload.phoneNumber = data.phoneNumber.trim();
    }

    if (data.profilePictureUrl) {
      payload.profilePictureUrl = data.profilePictureUrl;
    }

    if (Object.keys(payload).length === 0) {
      showError("No changes to update");
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await authService.updateProfile(payload);
      updateUser(updatedUser);
      showSuccess("Profile updated successfully!");
    } catch (err: any) {
      showError(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Profile Information
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex items-center gap-6">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
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
                {profilePictureUrl ? "Change Avatar" : "Upload Avatar"}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG or GIF. Max size 2MB
              </p>
            </div>
          </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="text"
              label="First Name"
              placeholder="Lucas"
              error={errors.firstName?.message}
              {...register("firstName")}
              required
            />
          </div>

          <div>
            <Input
              type="text"
              label="Last Name"
              placeholder="Nguyen"
              error={errors.lastName?.message}
              {...register("lastName")}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <Input
              type="text"
              value={user?.username || ""}
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={user?.email || ""}
              disabled
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <Input
            type="tel"
            label="Phone Number"
            placeholder="0912 345 678"
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
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
                reset({
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
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
  );
};
