import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@edumind/user-ui";
import { useAuthStore } from "../stores/auth.store";
import { CartIcon, CartDrawer } from "../components/payment-module";
import {
  BookOpen,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Award,
  Settings,
  UserPlus,
  FileText,
} from "lucide-react";
import { TEACHER_ROUTES, USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { teacherApplicationService } from '../services/teacher-application.service';
import { queryKeys } from "../lib/query-keys";

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const isStudent = user?.roles.includes(UserRole.STUDENT);
  const isTeacher =
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL);

  // Use React Query to fetch application status (prevents request waterfall)
  const { data: applicationData } = useQuery({
    queryKey: queryKeys.teacherApplication.myApplication(user?.id),
    queryFn: async () => {
      try {
        return await teacherApplicationService.getMyApplication();
      } catch (error: any) {
        // Return null for 404 (no application exists)
        if (error.response?.status === 404 || error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(isStudent && isAuthenticated && user?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.response?.status === 404 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const hasApplication = Boolean(applicationData);
  const applicationStatus = applicationData?.status || null;

  const handleLogout = () => {
    logout();
    navigate(USER_ROUTES.ROOT);
  };

  const isActivePath = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={USER_ROUTES.ROOT} className="flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EduMind</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to={USER_ROUTES.COURSES}
                className={`transition-colors ${
                  isActivePath(USER_ROUTES.COURSES) &&
                  !isActivePath(USER_ROUTES.COURSES + "/")
                    ? "text-blue-600 font-medium"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Browse Courses
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to={USER_ROUTES.DASHBOARD}
                    className={`transition-colors ${
                      isActivePath(USER_ROUTES.DASHBOARD)
                        ? "text-blue-600 font-medium"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={USER_ROUTES.LEARNING}
                    className={`transition-colors ${
                      isActivePath(USER_ROUTES.LEARNING)
                        ? "text-blue-600 font-medium"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    My Learning
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  {/* Cart */}
                  <CartIcon onClick={() => setCartDrawerOpen(true)} />

                  {/* Wishlist */}
                  <button
                    onClick={() => navigate(USER_ROUTES.WISHLIST)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Wishlist"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isActivePath(USER_ROUTES.WISHLIST)
                          ? "text-red-500"
                          : "text-gray-600"
                      }`}
                    />
                  </button>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {user?.profilePictureUrl ? (
                          <img
                            src={user?.profilePictureUrl}
                            alt="User Avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          user?.firstName?.charAt(0).toUpperCase() || "U"
                        )}
                      </div>
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                        <div className="px-4 py-2 border-b">
                          <p className="font-semibold text-gray-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                        </div>

                        <button
                          onClick={() => {
                            navigate(USER_ROUTES.DASHBOARD);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </button>

                        <button
                          onClick={() => {
                            navigate(USER_ROUTES.LEARNING);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          <BookOpen className="w-4 h-4" />
                          My Learning
                        </button>

                        <button
                          onClick={() => {
                            navigate(USER_ROUTES.CERTIFICATES);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          <Award className="w-4 h-4" />
                          Certificates
                        </button>

                        <button
                          onClick={() => {
                            navigate(USER_ROUTES.WISHLIST);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          <Heart className="w-4 h-4" />
                          Wishlist
                        </button>

                        {/* ========================================== */}
                        {/* STUDENT: Teacher Application Section */}
                        {/* ========================================== */}
                        {isStudent && (
                          <>
                            <div className="border-t border-gray-100 my-2" />

                            {!hasApplication ? (
                              <Link
                                to={USER_ROUTES.TEACHER_APPLICATION}
                                className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <UserPlus className="w-4 h-4 mr-3" />
                                <span>Become a Teacher</span>
                              </Link>
                            ) : (
                              <Link
                                to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setUserMenuOpen(false)}
                              >
                                <FileText className="w-4 h-4 mr-3 text-gray-400" />
                                <span >Application Status</span>
                              </Link>
                            )}
                          </>
                        )}

                        {/* ========================================== */}
                        {/* TEACHER: Teacher Dashboard Link */}
                        {/* ========================================== */}
                        {isTeacher && (
                          <>
                            <div className="border-t border-gray-100 my-2" />
                            <Link
                              to={TEACHER_ROUTES.DASHBOARD}
                              className="flex items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <GraduationCap className="w-4 h-4 mr-3" />
                              Teacher Dashboard
                            </Link>
                          </>
                        )}

                        <div className="border-t my-2" />

                        <button
                          onClick={() => {
                            navigate(USER_ROUTES.PROFILE_SETTINGS);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(USER_ROUTES.LOGIN)}
                  >
                    Login
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => navigate(USER_ROUTES.SIGNUP)}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <Link
                  to={USER_ROUTES.COURSES}
                  className="text-gray-700 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Browse Courses
                </Link>

                {isAuthenticated && (
                  <>
                    <Link
                      to={USER_ROUTES.DASHBOARD}
                      className="text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={USER_ROUTES.LEARNING}
                      className="text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Learning
                    </Link>
                    <Link
                      to={USER_ROUTES.WISHLIST}
                      className="text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Wishlist
                    </Link>
                    <Link
                      to={USER_ROUTES.CERTIFICATES}
                      className="text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Certificates
                    </Link>
                    <Link
                      to={USER_ROUTES.PROFILE_SETTINGS}
                      className="text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>

                    {/* ========================================== */}
                    {/* MOBILE: Teacher Application Links */}
                    {/* ========================================== */}
                    {isStudent && (
                      <>
                        <div className="border-t border-gray-200 my-2" />
                        {!hasApplication ? (
                          <Link
                            to={USER_ROUTES.TEACHER_APPLICATION}
                            className="flex items-center justify-between text-blue-600 font-medium"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-5 h-5" />
                              <span>Become a Teacher</span>
                            </div>
                          </Link>
                        ) : (
                          <Link
                            to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                            className="flex items-center justify-between text-gray-700 hover:text-blue-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              <span>Application Status</span>
                            </div>
                          </Link>
                        )}
                      </>
                    )}

                    {/* MOBILE: Teacher Dashboard Link */}
                    {isTeacher && (
                      <>
                        <div className="border-t border-gray-200 my-2" />
                        <Link
                          to={TEACHER_ROUTES.DASHBOARD}
                          className="flex items-center gap-2 text-green-600 font-medium"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <GraduationCap className="w-5 h-5" />
                          <span>Teacher Dashboard</span>
                        </Link>
                      </>
                    )}
                  </>
                )}

                {isAuthenticated ? (
                  <Button
                    variant="secondary"
                    onClick={handleLogout}
                    className="w-full"
                  >
                    Logout
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigate(USER_ROUTES.LOGIN);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Login
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        navigate(USER_ROUTES.SIGNUP);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-gray-900">EduMind</span>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered learning platform for everyone
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Courses</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    to={USER_ROUTES.COURSES}
                    className="hover:text-blue-600"
                  >
                    Browse All
                  </Link>
                </li>
                <li>
                  <Link
                    to={`${USER_ROUTES.COURSES}?level=BEGINNER`}
                    className="hover:text-blue-600"
                  >
                    Beginner
                  </Link>
                </li>
                <li>
                  <Link
                    to={`${USER_ROUTES.COURSES}?level=ADVANCED`}
                    className="hover:text-blue-600"
                  >
                    Advanced
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
            <p>&copy; 2026 EduMind. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
