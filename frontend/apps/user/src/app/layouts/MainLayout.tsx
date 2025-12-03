import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@edumind/user-ui";
import { useAuthStore } from "../stores/auth.store";
import { GraduationCap, Heart, User, LogOut, Menu, X } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Helper function to check if a route is active
  const isActive = (path: string) => {
    // Normalize paths - ensure both have leading slash
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const currentPath = location.pathname;
    
    if (normalizedPath === "/") {
      return currentPath === "/";
    }
    
    // Check if current path starts with the normalized path
    // This handles both exact matches and sub-routes (e.g., /courses/123 matches /courses)
    return currentPath === normalizedPath || currentPath.startsWith(`${normalizedPath}/`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EduMind</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to={USER_ROUTES.COURSES}
                className={`transition-colors ${
                  isActive(USER_ROUTES.COURSES)
                    ? "text-blue-600 font-semibold"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Browse Courses
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to={USER_ROUTES.LEARNING}
                    className={`transition-colors ${
                      isActive(USER_ROUTES.LEARNING)
                        ? "text-blue-600 font-semibold"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    My Learning
                  </Link>
                  <Link
                    to="/wishlist"
                    className={`transition-colors ${
                      isActive("/wishlist")
                        ? "text-blue-600 font-semibold"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    <Heart className="w-5 h-5" />
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {user?.firstName || user?.email}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={handleLogout} size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </Button>
                  <Button variant="primary" onClick={() => navigate("/signup")}>
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
                  className={`transition-colors ${
                    isActive(USER_ROUTES.COURSES)
                      ? "text-blue-600 font-semibold"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Browse Courses
                </Link>

                {isAuthenticated && (
                  <>
                    <Link
                      to={USER_ROUTES.LEARNING}
                      className={`transition-colors ${
                        isActive(USER_ROUTES.LEARNING)
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700 hover:text-blue-600"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Learning
                    </Link>
                    <Link
                      to="/wishlist"
                      className={`transition-colors ${
                        isActive("/wishlist")
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700 hover:text-blue-600"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Wishlist
                    </Link>
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
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Login
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        navigate("/signup");
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
                  <Link to="/courses" className="hover:text-blue-600">
                    Browse All
                  </Link>
                </li>
                <li>
                  <Link
                    to="/courses?level=beginner"
                    className="hover:text-blue-600"
                  >
                    Beginner
                  </Link>
                </li>
                <li>
                  <Link
                    to="/courses?level=advanced"
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
