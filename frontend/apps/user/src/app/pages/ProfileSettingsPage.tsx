import React, { useState } from 'react';
import { Card } from '@edumind/user-ui';
import { useAuthStore } from '../stores/auth.store';
import { ProfileTab } from '../components/course-module/ProfileTab';
import { PasswordTab } from '../components/course-module/PasswordTab';
import { NotificationsTab } from '../components/course-module/NotificationsTab';
import { SecurityTab } from '../components/course-module/SecurityTab';
import { User as UserIcon, Lock, Bell, Shield } from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'security'>('profile');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
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
                  { id: 'notifications', icon: Bell, label: 'Notifications' },
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
          <main className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileTab user={user} updateUser={setUser} />}
            {activeTab === 'password' && <PasswordTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'security' && <SecurityTab user={user} />}
          </main>
        </div>
      </div>
    </div>
  );
};