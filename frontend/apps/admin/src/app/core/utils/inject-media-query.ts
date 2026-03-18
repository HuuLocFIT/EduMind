import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Returns a readonly Signal<boolean> that reflects the current match state of the given
 * media query string. The listener is automatically removed on component destroy.
 *
 * Must be called in an injection context (field initializer or constructor).
 */
export function injectMediaQuery(query: string): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const mq = window.matchMedia(query);
  const matches = signal(mq.matches);

  const handler = (e: MediaQueryListEvent) => matches.set(e.matches);
  mq.addEventListener('change', handler);
  destroyRef.onDestroy(() => mq.removeEventListener('change', handler));

  return matches.asReadonly();
}
