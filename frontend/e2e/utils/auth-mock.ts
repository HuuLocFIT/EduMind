import type { Page } from '@playwright/test';

/**
 * The user app's AuthBootBoundary mandates a POST /api/auth/refresh probe on every page
 * load before it will render protected content or treat a persisted `auth-storage`
 * snapshot as confirmed (see apps/user/src/app/stores/auth.store.ts bootstrapAuthSession).
 * A fixture route that doesn't answer this exact endpoint with a schema-shaped body
 * leaves the app parked on authBootStatus 'retry' forever, since isTerminalRefreshFailure
 * only resolves for a structured ApiError carrying errorCode 'ERR_2004' — any other shape
 * (404, malformed JSON, or no route at all) is treated as a transient failure that never
 * settles into 'ready'. Every a11y fixture that touches an authenticated or guest boot
 * must mock this endpoint explicitly; letting it fall through to a real network call is
 * what breaks the suite's "backend independent" design.
 */

type RefreshUser = {
  id: number;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  is2faEnabled: boolean;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Confirms the seeded `auth-storage` snapshot: the boot probe resolves as the same identity. */
export async function mockAuthenticatedRefresh(
  page: Page,
  user: RefreshUser,
  accessToken: string,
): Promise<void> {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 200,
        success: true,
        data: { accessToken, tokenType: 'Bearer', user },
      }),
    }),
  );
}

/** No session to confirm: the boot probe fails terminally so authBootStatus reaches 'ready'. */
export async function mockGuestRefresh(page: Page): Promise<void> {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 401,
        success: false,
        message: 'No refresh token present',
        errorCode: 'ERR_2004',
        timestamp: new Date(0).toISOString(),
      }),
    }),
  );
}
