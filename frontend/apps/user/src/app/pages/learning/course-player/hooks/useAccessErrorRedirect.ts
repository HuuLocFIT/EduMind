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

  useEffect(() => {
    if (!accessError) return;

    setRedirectCountdown(REDIRECT_DELAY_SECONDS);

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onRedirect(accessError.redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessError, onRedirect]);

  return redirectCountdown;
}
