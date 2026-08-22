import { useEffect, useState } from "react";

/**
 * Prevent auth-dependent controls from being baked into prerendered HTML.
 *
 * A real browser starts with neutral UI and reveals the synchronously hydrated
 * auth state after the first commit. Puppeteer keeps the neutral state for the
 * lifetime of the prerender page, so page.content() cannot capture guest UI.
 */
export function useAuthUiReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!window.__EDUMIND_PRERENDER__) {
      setIsReady(true);
    }
  }, []);

  return isReady;
}
