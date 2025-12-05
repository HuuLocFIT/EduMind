import React, { useState } from 'react';
import { Card, Button } from '@edumind/user-ui';

export const NotificationsTab: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
      emailNotifications: {
        courseUpdates: true,
        promotions: false,
        recommendations: true,
        comments: true,
      },
      pushNotifications: {
        newLessons: true,
        assignments: true,
        messages: true,
      },
    });
  
  const handleToggle = (category: 'emailNotifications' | 'pushNotifications', key: string) => {
    setSettings(prev => {
      if (category === 'emailNotifications') {
        return {
          ...prev,
          emailNotifications: {
            ...prev.emailNotifications,
            [key]: !prev.emailNotifications[key as keyof typeof prev.emailNotifications],
          },
        };
      } else {
        return {
          ...prev,
          pushNotifications: {
            ...prev.pushNotifications,
            [key]: !prev.pushNotifications[key as keyof typeof prev.pushNotifications],
          },
        };
      }
    });
  };
  
    const handleSave = async () => {
      setLoading(true);
  
      try {
        // TODO: Implement updateNotificationSettings API endpoint
        // await AuthService.updateNotificationSettings(settings);
        
        alert('Notification settings updated!');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to update settings');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
  
        <div className="space-y-8">
          {/* Email Notifications */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              {Object.entries(settings.emailNotifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      Receive emails about {key.toLowerCase()}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle('emailNotifications', key)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
  
          {/* Push Notifications */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Push Notifications</h3>
            <div className="space-y-4">
              {Object.entries(settings.pushNotifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      Get notified about {key.toLowerCase()}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle('pushNotifications', key)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
  
          <div className="pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={loading}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    );
  };