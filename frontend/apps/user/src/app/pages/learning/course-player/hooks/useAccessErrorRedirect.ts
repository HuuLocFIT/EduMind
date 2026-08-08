import { useEffect, useState } from 'react';
import type { AccessError } from '../course-player.types';

const REDIRECT_DELAY_SECONDS = 10;

/**
 * Drives the "redirecting in N seconds" countdown shown alongside an
 * access-error dialog. Resets to 10 whenever a new access error appears and
 * calls onRedirect once the countdown reaches zero.
 */
export function useAccessErrorRedirect(
  accessError: AccessError | null,
  onRedirect: (redirectTo: string) => void
) {
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [trackedError, setTrackedError] = useState(accessError);

  // Reset during render so the countdown is already back at 10 before the
  // redirect effect below observes it for a brand new access error.
  if (accessError !== trackedError) {
    setTrackedError(accessError);
    setRedirectCountdown(REDIRECT_DELAY_SECONDS);
  }

  useEffect(() => {
    if (!accessError) return;

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [accessError]);

  useEffect(() => {
    if (!accessError || redirectCountdown > 0) return;
    onRedirect(accessError.redirectTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessError, redirectCountdown]);

  return redirectCountdown;
}
