import React from 'react';
import {
  BookOpen,
  Heart,
  Target,
  Award,
  Calendar,
  Zap,
  Flame,
} from 'lucide-react';

interface DashboardSidebarProps {
  currentStreak: number;
  wishlistCount: number;
  onBrowseCourses: () => void;
  onGoToWishlist: () => void;
  onGoToGoals: () => void;
  onGoToCertificates: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentStreak,
  wishlistCount,
  onBrowseCourses,
  onGoToWishlist,
  onGoToGoals,
  onGoToCertificates,
}) => {
  return (
    <aside className="lg:w-80 space-y-6">
      {/* Learning Streak */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Current Streak</h3>
            <p className="text-orange-100 text-sm">{currentStreak} days</p>
          </div>
        </div>
        <p className="text-orange-100 text-sm">
          Keep it up! Learn something new every day 🔥
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={onBrowseCourses}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-slate-900">Browse Courses</span>
          </button>

          <button
            onClick={onGoToWishlist}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
          >
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium text-slate-900">My Wishlist</span>
              {wishlistCount > 0 && (
                <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={onGoToGoals}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-medium text-slate-900">Learning Goals</span>
          </button>

          <button
            onClick={onGoToCertificates}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-slate-900">Certificates</span>
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming
        </h3>
        <div className="flex items-center gap-3 text-slate-500">
          <p className="text-sm">No upcoming events</p>
        </div>
      </div>

      {/* Pro Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Pro Tip</h3>
            <p className="text-slate-600 text-sm">
              Consistent daily learning beats occasional cramming. Try 20 minutes today!
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
