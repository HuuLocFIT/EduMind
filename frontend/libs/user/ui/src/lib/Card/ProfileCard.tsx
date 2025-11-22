import React from "react";
import { Card } from "./Card";

export interface ProfileCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  bio?: string;
  stats?: Array<{ label: string; value: string | number }>;
  actions?: React.ReactNode;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  avatarUrl,
  role,
  bio,
  stats,
  actions,
  className,
}) => {
  return (
    <Card variant="elevated" padding="lg" className={className}>
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
        {role && (
          <span className="inline-block px-3 py-1 mt-2 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
            {role}
          </span>
        )}

        {/* Bio */}
        {bio && <p className="text-sm text-gray-600 mt-4">{bio}</p>}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-4 w-full mt-6 pt-6 border-t border-gray-200">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && <div className="w-full mt-6">{actions}</div>}
      </div>
    </Card>
  );
};
