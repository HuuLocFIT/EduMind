import React, { useState } from "react";
import { Card, Button, Input } from "@edumind/user-ui";
import type { User } from "@edumind/shared-types";

interface ProfileTabProps {
  user: User | null;
  updateUser: (user: User) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, updateUser }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    username: user?.username || "",
    phoneNumber: user?.phoneNumber || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement updateProfile API endpoint
      // For now, just update local state
      if (user) {
        const updatedUser = {
          ...user,
          ...formData,
        };
        updateUser(updatedUser);
      }
      alert("Profile updated successfully!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Profile Information
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload - Phase 4 */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-semibold">
            {user?.firstName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <Button variant="secondary" type="button">
              Change Avatar
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

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username *
          </label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled // Email usually can't be changed
          />
          <p className="text-sm text-gray-500 mt-1">
            Contact support to change your email address
          </p>
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

        {/* Actions */}
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
              })
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};
