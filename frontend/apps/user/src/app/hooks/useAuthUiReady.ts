import { useState } from "react";
import { useAuthStore } from "../stores/auth.store";

/**
 * Whether it is safe to render auth-dependent UI (login/logout controls, cart, wishlist,
 * dashboard links, ...) from the current auth snapshot.
 *
 * Two independent reasons to stay neutral, both handled here so every call site gets both
 * for free:
 * - Puppeteer prerendering: `window.__EDUMIND_PRERENDER__` is set via evaluateOnNewDocument,
 *   so it is already readable synchronously on the very first render — before any component
 *   mounts. Deferring the check to a post-mount effect would force every real browser load
 *   (including a warm reload with already-hydrated auth state) through a neutral-then-revealed
 *   flash for no reason. Reading it synchronously means a real browser is ready immediately,
 *   while Puppeteer (where the flag is true for the page's entire lifetime) stays neutral.
 * - The mandatory boot probe (bootstrapAuthSession): the persisted snapshot is only a hint
 *   until `/auth/refresh` confirms it, so auth-dependent UI must stay neutral until
 *   `authBootStatus` reaches 'ready' — otherwise a stale/wrong-portal snapshot would flash
 *   before the boot probe corrects it.
 */
export function useAuthUiReady(): boolean {
  const [isPrerender] = useState(() => Boolean(window.__EDUMIND_PRERENDER__));
  const isBootReady = useAuthStore((state) => state.authBootStatus === "ready");
  return !isPrerender && isBootReady;
}
