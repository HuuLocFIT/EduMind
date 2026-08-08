import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useTeacherStatus } from "../components/teacher/TeacherGuard";
import { TEACHER_ROUTES, USER_ROUTES } from "@edumind/shared-utils";
import { CloudinaryImage } from "@edumind/user-ui";
import { UploadBadge } from "../components/teacher/UploadBadge";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Star,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Plus,
  GraduationCap,
  LogOut,
  Home,
  AlertTriangle,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@edumind/user-ui";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: TEACHER_ROUTES.DASHBOARD,
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "My Courses",
    path: TEACHER_ROUTES.COURSES,
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    label: "Students",
    path: TEACHER_ROUTES.STUDENTS,
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Reviews",
    path: TEACHER_ROUTES.REVIEWS,
    icon: <Star className="w-5 h-5" />,
  },
  {
    label: "Earnings",
    path: TEACHER_ROUTES.EARNINGS,
    icon: <DollarSign className="w-5 h-5" />,
  }
];

import { SeoMetaTags } from "../components/Seo/SeoMetaTags";

export const TeacherLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isTrialTeacher, trialDaysRemaining, isTrialExpired } = useTeacherStatus();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useBeforeUnloadWarning();

  const handleLogout = () => {
    logout();
    navigate(USER_ROUTES.ROOT);
  };

  const isActivePath = (path: string) => {
    if (path === TEACHER_ROUTES.DASHBOARD) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderTrialBanner = () => {
    if (!isTrialTeacher) return null;

    const isUrgent = trialDaysRemaining !== null && trialDaysRemaining <= 7;

    return (
      <div
        className={`px-4 py-3 ${
          isTrialExpired
            ? "bg-red-50 border-red-200"
            : isUrgent
            ? "bg-amber-50 border-amber-200"
            : "bg-blue-50 border-blue-200"
        } border-b`}
      >
        <div className="flex items-center gap-2">
          {isTrialExpired ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600" />
          )}
          <span
            className={`text-sm font-medium ${
              isTrialExpired
                ? "text-red-700"
                : isUrgent
                ? "text-amber-700"
                : "text-blue-700"
            }`}
          >
            {isTrialExpired
              ? "Trial period has expired"
              : `Trial: ${trialDaysRemaining} days remaining`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <SeoMetaTags
        title="Teacher Portal"
        description="EduMind Teacher Portal"
        noIndex={true}
      />
      <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          <Link to={TEACHER_ROUTES.DASHBOARD} className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-green-600" />
            <span className="font-bold text-gray-900">Teacher Portal</span>
          </Link>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Mobile Trial Banner */}
        {renderTrialBanner()}
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileMenuOpen(false);
            }
          }}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r z-50 transform transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 h-16 border-b">
            <GraduationCap className="w-7 h-7 text-green-600" />
            <span className="font-bold text-gray-900">Teacher Portal</span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActivePath(item.path)
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t space-y-2">
            <Link
              to={USER_ROUTES.ROOT}
              className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Back to Main Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r h-screen sticky top-0 transition-all duration-200 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b">
            {sidebarOpen ? (
              <Link
                to={TEACHER_ROUTES.DASHBOARD}
                className="flex items-center gap-2"
              >
                <GraduationCap className="w-7 h-7 text-green-600" />
                <span className="font-bold text-gray-900">Teacher Portal</span>
              </Link>
            ) : (
              <Link
                to={TEACHER_ROUTES.DASHBOARD}
                className="mx-auto"
              >
                <GraduationCap className="w-7 h-7 text-green-600" />
              </Link>
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 ${
                !sidebarOpen && "hidden"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Trial Banner */}
          {sidebarOpen && renderTrialBanner()}

          {/* Create Course Button */}
          <div className="p-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
              leftIcon={<Plus className="w-4 h-4" />}
              className={`bg-green-600 hover:bg-green-700 ${
                !sidebarOpen && "!px-0 justify-center"
              }`}
            >
              {sidebarOpen ? "New Course" : ""}
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActivePath(item.path)
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!sidebarOpen && "justify-center"}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && item.badge && (
                  <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t">
            {/* User Info */}
            {sidebarOpen && (
              <div className="flex items-center gap-3 px-3 py-2 mb-3">
                <div className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  <CloudinaryImage
                    src={user?.profilePictureUrl}
                    alt="Avatar"
                    widths={[72]}
                    priority={true}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  {!user?.profilePictureUrl && (user?.firstName?.charAt(0).toUpperCase() || "T")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            )}

            {/* Back to Main Site */}
            <Link
              to={USER_ROUTES.ROOT}
              className={`flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg ${
                !sidebarOpen && "justify-center"
              }`}
              title={!sidebarOpen ? "Back to Main Site" : undefined}
            >
              <Home className="w-5 h-5" />
              {sidebarOpen && <span>Back to Main Site</span>}
            </Link>

            {/* Toggle Sidebar (collapsed state) */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center px-3 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg mt-2"
                title="Expand Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          aria-label="Main content"
          tabIndex={-1}
          className="flex-1 min-h-screen overflow-x-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between bg-white border-b px-6 h-16 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-semibold text-gray-900">
                {navItems.find((item) => isActivePath(item.path))?.label ||
                  "Teacher Portal"}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Course
              </Button>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden xl:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isTrialTeacher ? "Trial Teacher" : "Teacher"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Upload Badge */}
      <UploadBadge />
    </div>
    </>
  );
};
