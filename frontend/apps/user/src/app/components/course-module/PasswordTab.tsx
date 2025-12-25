import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Button, PasswordInput, useToast } from '@edumind/user-ui';
import {
  ChangePasswordRequestSchema,
} from '@edumind/shared-types';
import { authService } from '../../services/auth.service';

// Extended schema with password match validation
const ChangePasswordFormSchema = ChangePasswordRequestSchema.refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  }
);

type ChangePasswordFormData = z.infer<typeof ChangePasswordFormSchema>;

export const PasswordTab: React.FC = () => {
  const {
    success: showSuccess,
    error: showError,
  } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      showSuccess('Password changed successfully!');
      reset();
    } catch (err: any) {
      showError(err?.message || 'Failed to change password');
    }
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <div>
          <PasswordInput
            label="Current Password"
            placeholder="••••••••"
            error={errors.currentPassword?.message}
            fullWidth
            required
            {...register('currentPassword')}
          />
        </div>

        <div>
          <PasswordInput
            label="New Password"
            placeholder="••••••••"
            error={errors.newPassword?.message}
            fullWidth
            required
            {...register('newPassword')}
          />
          <p className="text-sm text-gray-500 mt-1">
            Must be at least 8 characters with uppercase, lowercase, numbers and special characters
          </p>
        </div>

        <div>
          <PasswordInput
            label="Confirm New Password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            fullWidth
            required
            {...register('confirmPassword')}
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
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
  );
};