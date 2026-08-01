import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@edumind/user-ui";
import type { RouteNotificationState } from "../lib/route-notification";

export function ScrollToTop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error, warning, info } = useToast();
  const { pathname } = location;
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathnameRef.current === null || prevPathnameRef.current === pathname) {
      prevPathnameRef.current = pathname;
      return;
    }

    prevPathnameRef.current = pathname;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    let observer: MutationObserver | undefined;
    let fallbackTimer: number | undefined;
    let notificationTimer: number | undefined;

    const announceRouteNotification = () => {
      const routeState = location.state as RouteNotificationState | null;
      const notification = routeState?.notification;
      if (!notification) return;

      notificationTimer = window.setTimeout(() => {
        switch (notification.variant) {
          case "error":
            error(notification.message);
            break;
          case "warning":
            warning(notification.message);
            break;
          case "info":
            info(notification.message);
            break;
          default:
            success(notification.message);
        }

        const remainingState = { ...routeState };
        delete remainingState.notification;
        navigate(
          {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
          {
            replace: true,
            state: Object.keys(remainingState).length > 0 ? remainingState : null,
          },
        );
      }, 0);
    };

    const focusPageHeading = () => {
      const main = document.getElementById("main-content");
      const heading = main?.querySelector<HTMLElement>(
        "h1:not([aria-hidden='true'])",
      );
      const headingText = heading?.textContent?.trim();

      if (!heading || !headingText) return false;

      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      document.title = `${headingText} | EduMind`;
      announceRouteNotification();
      observer?.disconnect();
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      return true;
    };

    const frame = window.requestAnimationFrame(() => {
      if (focusPageHeading()) return;

      const main = document.getElementById("main-content");
      if (!main) return;

      // Lazy routes may still be rendering their Suspense fallback. Wait for
      // the real page heading so VoiceOver receives useful context.
      observer = new MutationObserver(focusPageHeading);
      observer.observe(main, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      fallbackTimer = window.setTimeout(() => {
        observer?.disconnect();
        main.focus({ preventScroll: true });
        announceRouteNotification();
      }, 3000);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (notificationTimer !== undefined) window.clearTimeout(notificationTimer);
    };
  }, [
    pathname,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    success,
    error,
    warning,
    info,
  ]);

  return null;
}
