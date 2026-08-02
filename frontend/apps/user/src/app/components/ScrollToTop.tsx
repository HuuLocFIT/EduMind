import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@edumind/user-ui";
import type { RouteNotificationState } from "../lib/route-notification";

export function ScrollToTop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error, warning, info } = useToast();
  const routeId = `${location.pathname}${location.search}${location.hash}`;
  const prevRouteIdRef = useRef<string | null>(null);
  const lastFocusedHeadingRef = useRef<HTMLElement | null>(null);
  const latestContextRef = useRef({ location, navigate, success, error, warning, info });

  latestContextRef.current = { location, navigate, success, error, warning, info };

  useEffect(() => {
    const rememberFocusedHeading = (event: FocusEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.matches("#main-content h1:not([aria-hidden='true'])")
      ) {
        lastFocusedHeadingRef.current = target;
      }
    };

    document.addEventListener("focusin", rememberFocusedHeading);
    return () => document.removeEventListener("focusin", rememberFocusedHeading);
  }, []);

  useEffect(() => {
    if (prevRouteIdRef.current === null || prevRouteIdRef.current === routeId) {
      prevRouteIdRef.current = routeId;
      return;
    }

    prevRouteIdRef.current = routeId;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // Do not leave the previous page title exposed while a lazy destination
    // is rendering its skeleton.
    document.title = "EduMind";

    let observer: MutationObserver | undefined;
    let fallbackTimer: number | undefined;
    let notificationTimer: number | undefined;
    let notificationAnnounced = false;
    const outgoingHeading = lastFocusedHeadingRef.current;
    const outgoingHeadingText = outgoingHeading?.textContent?.trim();

    const announceRouteNotification = () => {
      if (notificationAnnounced) return;

      const {
        location: latestLocation,
        navigate: latestNavigate,
        success: latestSuccess,
        error: latestError,
        warning: latestWarning,
        info: latestInfo,
      } = latestContextRef.current;
      const routeState = latestLocation.state as RouteNotificationState | null;
      const notification = routeState?.notification;
      if (!notification) return;
      notificationAnnounced = true;

      notificationTimer = window.setTimeout(() => {
        switch (notification.variant) {
          case "error":
            latestError(notification.message);
            break;
          case "warning":
            latestWarning(notification.message);
            break;
          case "info":
            latestInfo(notification.message);
            break;
          default:
            latestSuccess(notification.message);
        }

        const remainingState = { ...routeState };
        delete remainingState.notification;
        latestNavigate(
          {
            pathname: latestLocation.pathname,
            search: latestLocation.search,
            hash: latestLocation.hash,
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
      // Suspense can briefly retain the outgoing route. Never treat its
      // focused heading as the destination heading.
      if (heading === outgoingHeading && headingText === outgoingHeadingText) {
        return false;
      }

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
        // Give users useful focus even when the destination is still loading,
        // but keep observing so the real h1 receives focus when it appears.
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
  }, [routeId]);

  return null;
}
