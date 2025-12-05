import React, { useState } from 'react';
import { Card, Button, Input, useToast, ToastContainer } from '@edumind/user-ui';
import AuthService from '@user/services/auth.service';

export const PasswordTab: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    const {
      toasts,
      success: showSuccess,
      error: showError,
      closeToast,
    } = useToast();
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
  
      if (formData.newPassword !== formData.confirmPassword) {
        alert('New passwords do not match');
        return;
      }
  
      if (formData.newPassword.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
  
      setLoading(true);
  
      try {
        await AuthService.changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        });

        showSuccess('Password changed successfully!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } catch (err: any) {
        showError(err?.message || 'Failed to change password');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <>
        <ToastContainer toasts={toasts} onClose={closeToast} />

        <Card className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
    
          <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password *
              </label>
              <Input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <Input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Must be at least 8 characters with letters and numbers
              </p>
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <Input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
    
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                Update Password
              </Button>
            </div>
          </form>
    
          {/* Password Tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Password Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a mix of uppercase and lowercase letters</li>
              <li>• Include numbers and special characters</li>
              <li>• Avoid common words and personal information</li>
              <li>• Don't reuse passwords from other sites</li>
            </ul>
          </div>
        </Card>
      </>
    );
  };