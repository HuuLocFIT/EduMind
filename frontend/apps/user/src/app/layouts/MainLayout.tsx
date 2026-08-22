import React, { useState, useRef, useEffect } from "react";
import {
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Button, CloudinaryImage } from "@edumind/user-ui";
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
  Package,
  RefreshCw,
} from "lucide-react";
import { TEACHER_ROUTES, USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { useTeacherApplication } from "../hooks";

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The course player renders its own full-height, viewport-fixed curriculum
  // sidebar (top-16 to bottom-0). If the site footer renders below it, the
  // fixed sidebar stays pinned over the footer as the page scrolls, visually
  // burying it. Suppress the global footer for that route instead of fighting
  // the sidebar's intentional fixed positioning.
  const isCoursePlayerRoute = location.pathname.startsWith(`${USER_ROUTES.LEARNING}/`);

  const mainContentHref = `${location.pathname}${location.search}#main-content`;
  const handleSkipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById("main-content");
    if (!main) return;

    const heading = main.querySelector<HTMLElement>(
      "h1:not([aria-hidden='true'])",
    );
    const target = heading ?? main;
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const targetTop =
      target.getBoundingClientRect().top + window.scrollY - headerHeight;

    if (heading) heading.tabIndex = -1;
    target.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "auto" });
  };

  useEffect(() => {
    if (userMenuOpen) {
      const menu = document.getElementById('user-dropdown-menu');
      const firstItem = menu?.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [userMenuOpen]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const menu = e.currentTarget;
    const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        setUserMenuOpen(false);
        menuTriggerRef.current?.focus();
        break;
      case 'Tab':
        setUserMenuOpen(false);
        break;
    }
  };

  const isStudent = user?.roles.includes(UserRole.STUDENT);
  const isTeacher =
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL);

  const { data: applicationData } = useTeacherApplication();

  const hasApplication = Boolean(applicationData);
  const handleLogout = async () => {
    await logout();
    navigate(USER_ROUTES.LOGIN);
  };

  const isActivePath = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Skip Link */}
      <a
        href={mainContentHref}
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <header ref={headerRef} className="bg-white border-b sticky top-0 z-50">
        <nav aria-label="Main navigation">
          <div className="mx-auto px-3 sm:px-6 lg:px-4">
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
                      aria-label="Wishlist"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isActivePath(USER_ROUTES.WISHLIST)
                            ? "text-red-500"
                            : "text-gray-600"
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* User Menu */}
                    <div className="relative">
                      <button
                        ref={menuTriggerRef}
                        data-testid="user-menu"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-expanded={userMenuOpen}
                        aria-haspopup="menu"
                        aria-controls="user-dropdown-menu"
                        aria-label="User menu"
                      >
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                          <CloudinaryImage
                            src={user?.profilePictureUrl}
                            alt={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || "User avatar"}
                            widths={[64]}
                            priority={true}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {!user?.profilePictureUrl && (user?.firstName?.charAt(0).toUpperCase() || "U")}
                        </div>
                      </button>

                      {/* Dropdown */}
                      {userMenuOpen && (
                        <div
                          id="user-dropdown-menu"
                          role="menu"
                          tabIndex={-1}
                          aria-label="User account options"
                          className="absolute right-0 mt-2 w-56 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                          onKeyDown={handleMenuKeyDown}
                        >
                          <div className="px-4 py-2 border-b min-w-0">
                            <p className="font-semibold text-gray-900 break-words">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-sm text-gray-600 break-all">{user?.email}</p>
                          </div>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.DASHBOARD);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                            Dashboard
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.LEARNING);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <BookOpen className="w-4 h-4" aria-hidden="true" />
                            My Learning
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.CERTIFICATES);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Award className="w-4 h-4" aria-hidden="true" />
                            Certificates
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.WISHLIST);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Heart className="w-4 h-4" aria-hidden="true" />
                            Wishlist
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.ORDERS);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Package className="w-4 h-4" aria-hidden="true" />
                            My Orders
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.REFUNDS);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <RefreshCw className="w-4 h-4" aria-hidden="true" />
                            My Refunds
                          </button>

                          {/* ========================================== */}
                          {/* STUDENT: Teacher Application Section */}
                          {/* ========================================== */}
                          {isStudent && (
                            <>
                              <div role="separator" className="border-t border-gray-100 my-2" />

                              {!hasApplication ? (
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    navigate(USER_ROUTES.TEACHER_APPLICATION);
                                    setUserMenuOpen(false);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                                >
                                  <UserPlus className="w-4 h-4 mr-3" aria-hidden="true" />
                                  <span>Become a Teacher</span>
                                </button>
                              ) : (
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    navigate(USER_ROUTES.TEACHER_APPLICATION_STATUS);
                                    setUserMenuOpen(false);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <FileText className="w-4 h-4 mr-3 text-gray-400" aria-hidden="true" />
                                  <span>Application Status</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* ========================================== */}
                          {/* TEACHER: Teacher Dashboard Link */}
                          {/* ========================================== */}
                          {isTeacher && (
                            <>
                              <div role="separator" className="border-t border-gray-100 my-2" />
                              <button
                                role="menuitem"
                                onClick={() => {
                                  navigate(TEACHER_ROUTES.DASHBOARD);
                                  setUserMenuOpen(false);
                                }}
                                className="w-full flex items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium"
                              >
                                <GraduationCap className="w-4 h-4 mr-3" aria-hidden="true" />
                                Teacher Dashboard
                              </button>
                            </>
                          )}

                          <div role="separator" className="border-t my-2" />

                          <button
                            role="menuitem"
                            onClick={() => {
                              navigate(USER_ROUTES.PROFILE_SETTINGS);
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                            <Settings className="w-4 h-4" aria-hidden="true" />
                            Settings
                          </button>

                          <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-red-600"
                          >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
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

              {/* Mobile Menu Button + Cart Icon */}
              <div className="flex items-center gap-1 md:hidden">
                {/* Cart Icon - Always visible on mobile for authenticated users */}
                {isAuthenticated && (
                  <CartIcon onClick={() => setCartDrawerOpen(true)} />
                )}
                
                {/* Hamburger Menu */}
                <button
                  className="hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" aria-hidden="true" />
                  ) : (
                    <Menu className="w-6 h-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <nav
                id="mobile-navigation"
                aria-label="Mobile navigation"
                className="md:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain py-4 border-t"
              >
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      to={USER_ROUTES.COURSES}
                      className="block w-full text-gray-700 hover:text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Browse Courses
                    </Link>
                  </li>

                  {isAuthenticated && (
                    <>
                      <li>
                        <Link
                          to={USER_ROUTES.DASHBOARD}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.LEARNING}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Learning
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.WISHLIST}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Wishlist
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.CERTIFICATES}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Certificates
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.ORDERS}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Orders
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.REFUNDS}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Refunds
                        </Link>
                      </li>
                      <li>
                        <Link
                          to={USER_ROUTES.PROFILE_SETTINGS}
                          className="block w-full text-gray-700 hover:text-blue-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Settings
                        </Link>
                      </li>

                      {/* ========================================== */}
                      {/* MOBILE: Teacher Application Links */}
                      {/* ========================================== */}
                      {isStudent && (
                        <>
                          <li className="border-t border-gray-200 my-2" />
                          {!hasApplication ? (
                            <li>
                              <Link
                                to={USER_ROUTES.TEACHER_APPLICATION}
                                className="flex items-center justify-between w-full text-blue-600 font-medium"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                <div className="flex items-center gap-2">
                                  <UserPlus className="w-5 h-5" />
                                  <span>Become a Teacher</span>
                                </div>
                              </Link>
                            </li>
                          ) : (
                            <li>
                              <Link
                                to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                                className="flex items-center justify-between w-full text-gray-700 hover:text-blue-600"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5" />
                                  <span>Application Status</span>
                                </div>
                              </Link>
                            </li>
                          )}
                        </>
                      )}

                      {/* MOBILE: Teacher Dashboard Link */}
                      {isTeacher && (
                        <>
                          <li className="border-t border-gray-200 my-2" />
                          <li>
                            <Link
                              to={TEACHER_ROUTES.DASHBOARD}
                              className="flex items-center gap-2 w-full text-green-600 font-medium"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <GraduationCap className="w-5 h-5" />
                              <span>Teacher Dashboard</span>
                            </Link>
                          </li>
                        </>
                      )}
                    </>
                  )}

                  {isAuthenticated ? (
                    <li>
                      <Button
                        variant="secondary"
                        onClick={handleLogout}
                        className="w-full"
                      >
                        Logout
                      </Button>
                    </li>
                  ) : (
                    <>
                      <li>
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
                      </li>
                      <li>
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
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        aria-label="Main content"
        tabIndex={-1}
        className="scroll-mt-16 flex-1 flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-600"
      >
        <Outlet />
      </main>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Footer — hidden on the course player route, see isCoursePlayerRoute above */}
      {!isCoursePlayerRoute && (
      <footer aria-label="Site footer" className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-6 sm:gap-8">
            <div className="col-span-2 xl:col-span-1">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-gray-900">EduMind</span>
              </div>
              <p className="text-sm text-gray-600 max-w-sm">
                AI-powered learning platform for everyone
              </p>
            </div>

            <section aria-labelledby="footer-courses">
              <h2 id="footer-courses" className="font-semibold text-gray-900 mb-2 sm:mb-4" style={{ fontSize: 'inherit' }}>Courses</h2>
              <ul className="space-y-1.5 sm:space-y-2 text-sm text-gray-600">
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
            </section>

            <section aria-labelledby="footer-support">
              <h2 id="footer-support" className="font-semibold text-gray-900 mb-2 sm:mb-4" style={{ fontSize: 'inherit' }}>Support</h2>
              <ul className="space-y-1.5 sm:space-y-2 text-sm text-gray-600">
                <li>
                  <a href="mailto:support@edumind.com" className="hover:text-blue-600">
                    Contact Us
                  </a>
                </li>
              </ul>
            </section>

            <section aria-labelledby="footer-legal">
              <h2 id="footer-legal" className="font-semibold text-gray-900 mb-2 sm:mb-4" style={{ fontSize: 'inherit' }}>Legal</h2>
              <ul className="space-y-1.5 sm:space-y-2 text-sm text-gray-600">
                <li>
                  <Link to={USER_ROUTES.TERMS} className="hover:text-blue-600">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-6 sm:mt-8 pt-5 sm:pt-8 border-t text-center text-sm text-gray-600">
            <p>&copy; 2026 Nguyễn Hữu Lộc. All rights reserved.</p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};
