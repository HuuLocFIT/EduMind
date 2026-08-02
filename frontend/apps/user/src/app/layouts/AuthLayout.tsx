import React, { useEffect, useMemo } from "react";
import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuthStore } from "../stores/auth.store";
import { USER_ROUTES } from "@edumind/shared-utils";

import { SeoMetaTags } from "../components/Seo/SeoMetaTags";

export const AuthLayout: React.FC = () => {
  const location = useLocation();
  const routeMetadata =
    {
      [USER_ROUTES.LOGIN]: {
        title: "Sign In",
        description: "Sign in to your EduMind account.",
      },
      [USER_ROUTES.SIGNUP]: {
        title: "Create Account",
        description: "Create an EduMind account to start learning.",
      },
      [USER_ROUTES.FORGOT_PASSWORD]: {
        title: "Forgot Password",
        description: "Request instructions to reset your EduMind password.",
      },
      [USER_ROUTES.RESET_PASSWORD]: {
        title: "Reset Password",
        description: "Create a new password for your EduMind account.",
      },
      [USER_ROUTES.RESEND_VERIFICATION]: {
        title: "Resend Verification Email",
        description: "Request a new EduMind account verification link.",
      },
    }[location.pathname] ?? {
      title: "Account",
      description: "Manage access to your EduMind account.",
    };
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;

    const focusHeading = () => {
      const heading = main.querySelector<HTMLElement>(
        "h1:not([aria-hidden='true'])",
      );
      if (!heading) return false;

      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return;

    // A first visit may still be rendering the lazy route. Wait for its h1
    // instead of leaving focus behind or announcing the previous page title.
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [location.pathname]);
  const mainContentHref = `${location.pathname}${location.search}#main-content`;
  const handleSkipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById("main-content");
    if (!main) return;

    const heading = main.querySelector<HTMLElement>(
      "h1:not([aria-hidden='true'])",
    );
    const target = heading ?? main;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;

    if (heading) heading.tabIndex = -1;
    target.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "auto" });
  };

  // Use selector to only subscribe to isAuthenticated changes
  // This prevents unnecessary re-renders when other store properties change
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Memoize the redirect to prevent re-render loops
  const redirect = useMemo(() => {
    if (isAuthenticated) {
      const from = location.state?.from;
      const destination =
        from && typeof from.pathname === "string" && from.pathname.startsWith("/")
          ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
          : USER_ROUTES.DASHBOARD;
      return <Navigate to={destination} replace />;
    }
    return null;
  }, [isAuthenticated, location.state]);

  // Redirect if already authenticated
  if (redirect) {
    return redirect;
  }

  return (
    <>
      <SeoMetaTags
        title={routeMetadata.title}
        description={routeMetadata.description}
        noIndex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <a
        href={mainContentHref}
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>
      <Link
        to={USER_ROUTES.ROOT}
        aria-label="EduMind home"
        className="absolute top-6 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-2 rounded-md text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600"
      >
        <GraduationCap aria-hidden="true" className="h-9 w-9 text-blue-600" />
        <span className="text-2xl font-bold">EduMind</span>
      </Link>
      {/* Decorative Background Elements */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Circle */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 blur-3xl"></div>
        
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Main Content */}
      <main
        key={location.pathname}
        id="main-content"
        aria-label="Main content"
        tabIndex={-1}
        className="relative min-h-screen flex items-center justify-center px-4 py-12 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-600"
      >
        <Outlet />
      </main>
    </div>
    </>
  );
};
