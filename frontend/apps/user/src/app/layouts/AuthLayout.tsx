import React, { useMemo } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { USER_ROUTES } from "@edumind/shared-utils";

import { SeoMetaTags } from "../components/Seo/SeoMetaTags";

export const AuthLayout: React.FC = () => {
  const location = useLocation();
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
      return <Navigate to={USER_ROUTES.DASHBOARD} replace />;
    }
    return null;
  }, [isAuthenticated]);

  // Redirect if already authenticated
  if (redirect) {
    return redirect;
  }

  return (
    <>
      <SeoMetaTags
        title="Account"
        description="EduMind Authentication"
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
