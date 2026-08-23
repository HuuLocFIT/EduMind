import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@edumind/user-ui";
import type { RouteNotificationState } from "../lib/route-notification";

export function ScrollToTop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error, warning, info } = useToast();
  const routeId = `${location.pathname}${location.search}${location.hash}`;
  // Search params are also used to mirror in-page state into the URL (the
  // course player's `?lesson=`, browse filters, pagination) — those are not
  // navigations. Only pathname/hash decide whether the destination page
  // changed, and therefore whether route-level focus and <title> handling
  // apply; a search-only change must not pull focus off whatever the page
  // itself just focused.
  const navigationId = `${location.pathname}${location.hash}`;
  const prevRouteIdRef = useRef<string | null>(null);
  const prevNavigationIdRef = useRef<string | null>(null);
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

  // A direct (non-SPA) load never runs the route-change effect below for its
  // first route — that effect's initial tick only records refs and returns.
  // Without this, a fresh page load keeps whatever <title> (or lack of one)
  // the server sent, failing WCAG 2.4.2 / axe's document-title check.
  useEffect(() => {
    // Guarantee a non-empty <title> the instant this effect runs (axe's
    // document-title check can fire before the page's own content — and
    // its h1 — has finished loading, e.g. while a "Loading courses"
    // skeleton is still on screen).
    document.title = "EduMind";

    let observer: MutationObserver | undefined;
    let fallbackTimer: number | undefined;

    const setInitialTitle = () => {
      // Something else (a page's own title effect, e.g. the course player's
      // lesson title) may have already taken over — never stomp on that.
      if (document.title !== "EduMind") {
        observer?.disconnect();
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        return true;
      }

      const main = document.getElementById("main-content");
      const heading = main?.querySelector<HTMLElement>(
        "h1:not([aria-hidden='true'])",
      );
      const headingText = heading?.textContent?.trim();
      if (!headingText) return false;

      document.title = `${headingText} | EduMind`;
      observer?.disconnect();
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      return true;
    };

    const frame = window.requestAnimationFrame(() => {
      if (setInitialTitle()) return;

      const main = document.getElementById("main-content");
      if (!main) return;

      observer = new MutationObserver(setInitialTitle);
      observer.observe(main, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      fallbackTimer = window.setTimeout(() => observer?.disconnect(), 5000);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
    // Runs once for the app's initial route only; subsequent navigations are
    // handled by the route-change effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevRouteIdRef.current === null || prevRouteIdRef.current === routeId) {
      prevRouteIdRef.current = routeId;
      prevNavigationIdRef.current = navigationId;
      return;
    }

    const isNavigation = prevNavigationIdRef.current !== navigationId;
    prevRouteIdRef.current = routeId;
    prevNavigationIdRef.current = navigationId;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

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

    // Same page, only its query params changed. Scrolling to top (above) and
    // delivering a route notification that rode along on `location.state` are
    // still correct; touching focus or the document title is not — the page
    // owns both while it stays mounted.
    if (!isNavigation) {
      announceRouteNotification();
      return () => {
        if (notificationTimer !== undefined) window.clearTimeout(notificationTimer);
      };
    }

    // Do not leave the previous page title exposed while a lazy destination
    // is rendering its skeleton.
    document.title = "EduMind";

    const focusPageHeading = () => {
      // An open modal owns initial focus and focus restoration. Do not let
      // route-level heading focus pull keyboard users out of its focus trap.
      const activeModal = document.querySelector(
        '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]',
      );
      if (activeModal) {
        announceRouteNotification();
        observer?.disconnect();
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        return true;
      }

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
    // navigationId is a substring of routeId, so it can never change on its
    // own — it is listed only to satisfy exhaustive-deps.
  }, [routeId, navigationId]);

  return null;
}
