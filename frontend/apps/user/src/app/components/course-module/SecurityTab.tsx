import React, { useState } from 'react';
import { Card, Button } from '@edumind/user-ui';
import type { User } from '@edumind/shared-types';
import { Shield, Trash2 } from 'lucide-react';

interface SecurityTabProps {
  user: User | null;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
    const [loading, setLoading] = useState(false);
  
    const handleEnable2FA = () => {
      // Navigate to 2FA setup page
      alert('2FA setup coming soon!');
    };
  
    const handleDeleteAccount = async () => {
      if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
      }
  
      if (!confirm('This will permanently delete all your data, enrollments, and progress. Are you absolutely sure?')) {
        return;
      }
  
      setLoading(true);
  
      try {
        // TODO: Implement deleteAccount API endpoint
        // await AuthService.deleteAccount();
        
        alert('Account deleted successfully');
        // Logout and redirect
        window.location.href = '/';
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete account');
      } finally {
        setLoading(false);
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
            <Button
              variant={user?.is2faEnabled ? 'secondary' : 'primary'}
              onClick={handleEnable2FA}
            >
              {user?.is2faEnabled ? 'Manage' : 'Enable'}
            </Button>
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
                  {navigator.userAgent.includes('Windows') ? 'Windows' : 
                   navigator.userAgent.includes('Mac') ? 'macOS' : 
                   navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown'} • {
                   navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown Browser'}
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
      </div>
    );
  };