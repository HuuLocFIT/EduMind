import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.requestAnimationFrame(() => {
        const main = document.getElementById("main-content");
        const heading = main?.querySelector<HTMLElement>("h1");
        main?.focus({ preventScroll: true });
        if (heading?.textContent?.trim()) {
          document.title = `${heading.textContent.trim()} | EduMind`;
        }
      });
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
