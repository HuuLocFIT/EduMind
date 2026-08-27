import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@edumind/user-ui';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { ProfileTab } from '../components/course-module/ProfileTab';
import { PasswordTab } from '../components/course-module/PasswordTab';
import { NotificationsTab } from '../components/course-module/NotificationsTab';
import { SecurityTab } from '../components/course-module/SecurityTab';
import { User as UserIcon, Lock, Bell, Shield } from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const location = useLocation();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'security'>('profile');

  // Handle navigation state to set active tab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Refresh user data when coming back from 2FA setup (only once)
  useEffect(() => {
    const refreshUser = async () => {
      // Only refresh if we have location state (coming from another page)
      if (location.state?.refreshUser) {
        try {
          const updatedUser = await authService.fetchCurrentUser();
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
      }
    };

    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]); // Use location.key to detect navigation changes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Account Settings</h1>
              <p className="text-blue-100 text-lg">
                Manage your profile, security, and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Tabs */}
          <aside className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                {[
                  { id: 'profile', icon: UserIcon, label: 'Profile' },
                  { id: 'password', icon: Lock, label: 'Password' },
                  // { id: 'notifications', icon: Bell, label: 'Notifications' },
                  { id: 'security', icon: Shield, label: 'Security' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileTab user={user} updateUser={setUser} />}
            {activeTab === 'password' && <PasswordTab />}
            {/* {activeTab === 'notifications' && <NotificationsTab />} */}
            {activeTab === 'security' && <SecurityTab user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;