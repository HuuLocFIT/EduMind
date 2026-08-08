import { useRef } from 'react';

/**
 * Monotonic version counter for invalidating stale async work. Callers
 * capture `current()` before starting an async operation and re-check
 * `isCurrent(version)` after each await boundary; a `bump()` (typically from
 * an effect keyed on the identity the async work belongs to, e.g. courseSlug
 * or lessonId) invalidates every operation started before it without needing
 * an AbortSignal.
 */
export function useVersionGuard() {
  const versionRef = useRef(0);

  return {
    bump: () => ++versionRef.current,
    current: () => versionRef.current,
    isCurrent: (version: number) => version === versionRef.current,
  };
}
