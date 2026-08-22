import { useState } from "react";

/**
 * Prevent auth-dependent controls from being baked into prerendered HTML.
 *
 * `window.__EDUMIND_PRERENDER__` is set via Puppeteer's evaluateOnNewDocument,
 * so it is already readable synchronously on the very first render — before
 * any component mounts. Deferring the check to a post-mount effect would force
 * every real browser load (including a warm reload with already-hydrated auth
 * state) through a neutral-then-revealed flash for no reason. Reading it
 * synchronously means a real browser is ready immediately, while Puppeteer
 * (where the flag is true for the page's entire lifetime) stays neutral.
 */
export function useAuthUiReady(): boolean {
  const [isReady] = useState(() => !window.__EDUMIND_PRERENDER__);
  return isReady;
}
