import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import {
  ApiErrorSchema,
  JwtResponseSchema,
  RefreshTokenResponseSchema,
  type LoginRequest,
  type JwtResponse,
  type RefreshTokenResponse,
  type User,
} from '@edumind/shared-types';
import { UserRole } from '@edumind/shared-constants';
import { AUTH_ENDPOINTS, ADMIN_ROUTES } from '@edumind/shared-utils';

export type AdminUser = User;

/**
 * Thrown when an authenticated identity is confirmed to belong to another
 * portal (no ROLE_ADMIN). Carries the rejected user so callers (interceptor,
 * boot/focus reconcile) can hand it to rejectPortalIdentity() without status
 * codes - 403 alone doesn't distinguish this from a revoked/expired token.
 */
export class AdminPortalIdentityRejectedError extends Error {
  constructor(readonly rejectedUser: User) {
    super('Authenticated identity is not allowed in the admin portal');
    this.name = 'AdminPortalIdentityRejectedError';
  }
}

export function isAdminPortalIdentityRejectedError(
  error: unknown
): error is AdminPortalIdentityRejectedError {
  return error instanceof AdminPortalIdentityRejectedError;
}

/**
 * A terminal refresh failure (missing/revoked/expired refresh token, backend
 * errorCode ERR_2004) means the session is dead. Everything else - network
 * error, timeout, 5xx, malformed body, schema contract violation - proves
 * nothing about the session and must NOT be treated as a logout. Classifying
 * by errorCode rather than HTTP status matters: a wrong-portal identity also
 * arrives as 403, and a real 401 can be transient.
 */
export function isTerminalRefreshFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  const parsed = ApiErrorSchema.safeParse(error.error);
  return parsed.success && parsed.data.errorCode === 'ERR_2004';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'admin_auth_token';
  private readonly USER_KEY = 'admin_user';
  
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  // NOTE: REFRESH_TOKEN_KEY removed - refresh token is in HTTP-Only Cookie

  // Signals for reactive state
  isLoading = signal(false);
  error = signal<string | null>(null);
  // True once a confirmed identity has been rejected as belonging to another
  // portal. Distinct from a plain logged-out state - see rejectPortalIdentity().
  portalMismatch = signal(false);
  // The identity that was rejected, for the mismatch UI to reference.
  rejectedIdentity = signal<User | null>(null);
  // True after a refresh failure that does NOT prove the session is dead
  // (network/timeout/5xx/malformed/missing user). The stored snapshot is kept
  // but must not be rendered as authenticated while this is true.
  temporaryReconcileFailure = signal(false);

  // Boot-time reconcile status, read by the app shell to decide what to
  // render before any admin UI backed by the stored snapshot is shown.
  // 'idle' -> 'checking' -> 'ready' (success, mismatch, or terminal failure -
  // all are settled outcomes) or 'retry' (unconfirmed failure, stored
  // snapshot kept but must not be rendered as authenticated).
  authBootStatus = signal<'idle' | 'checking' | 'ready' | 'retry'>('idle');

  // True while the escape hatch out of a portalMismatch dead end is active:
  // local state is cleared, the shared cookie is left untouched, and the
  // login route is allowed to render even though portalMismatch is still
  // true. Closed by any completed transition (successful login/refresh, or
  // another wrong-role login attempt falling back to the mismatch page).
  isSwitchingAccount = signal(false);
  // The deep-link the user was on when the escape hatch was opened, so a
  // successful switch-account login can return them to it. One-time use -
  // see consumeReturnUrl().
  private pendingReturnUrl: string | null = null;

  // True while a foreground (visibility-triggered) reconcile probe is in
  // flight. The app shell blocks auth-sensitive interaction while this is
  // true, without unmounting the current layout - see
  // fix_multiple_account_on_browser_profile.md P1-10, invariant #7.
  isRefreshingSession = signal(false);

  // Shared in-flight refresh pipeline - every caller (boot, focus, interceptor)
  // subscribes to this same observable and gets the same result, instead of
  // racing separate refresh calls.
  private refreshInProgress$: Observable<RefreshTokenResponse> | null = null;

  // BehaviorSubject for current user
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  /**
   * Login with credentials
   * Refresh token is set via HTTP-Only Cookie by backend
   */
  login(credentials: LoginRequest): Observable<JwtResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http
      .post<JwtResponse>(
        `${this.API_URL}${AUTH_ENDPOINTS.LOGIN}`, 
        credentials,
        { withCredentials: true } // Required for cookie
      )
      .pipe(
        switchMap((response) => {
          if (!response) {
            throw this.createError('Invalid response from server', 500);
          }

          const validated = JwtResponseSchema.parse(response);
          this.assertAdminPortalIdentity(validated.user);
          this.handleAuthSuccess(validated);
          return of(validated);
        }),
        catchError((error) => this.handleError(error)),
        finalize(() => this.isLoading.set(false))
      );
  }

  /**
   * Refresh access token
   * No body needed - refresh token is sent via HTTP-Only Cookie
   */
  refreshToken(): Observable<RefreshTokenResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    const refresh$ = this.http
      .post<RefreshTokenResponse>(
        `${this.API_URL}${AUTH_ENDPOINTS.REFRESH}`,
        {}, // Empty body - cookie is sent automatically
        { withCredentials: true }
      )
      .pipe(
        map((response) => RefreshTokenResponseSchema.parse(response)),
        tap((response) => {
          // Validate before any persistence - a rejected identity must never
          // be written to storage, even transiently.
          this.assertAdminPortalIdentity(response.user);
        }),
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.temporaryReconcileFailure.set(false);
          // A confirmed matching identity closes out any earlier mismatch -
          // whether this refresh was a normal reconcile or the tail end of a
          // successful switch-account escape.
          this.portalMismatch.set(false);
          this.rejectedIdentity.set(null);
          this.isSwitchingAccount.set(false);
        }),
        finalize(() => {
          this.refreshInProgress$ = null;
        }),
        shareReplay(1)
      );

    this.refreshInProgress$ = refresh$;
    return refresh$;
  }

  /**
   * Logout - calls backend to clear cookie
   */
  logout(): void {
    // Call backend to revoke tokens and clear cookie
    this.http
      .post(
        `${this.API_URL}${AUTH_ENDPOINTS.LOGOUT}`,
        {},
        { withCredentials: true }
      )
      .pipe(
        catchError(() => of(null)) // Continue even if API fails
      )
      .subscribe(() => {
        this.clearAuthData();
        this.currentUserSubject.next(null);
        this.router.navigate([ADMIN_ROUTES.AUTH_LOGIN]);
      });
  }

  /**
   * Force logout without API call (used when refresh fails)
   */
  forceLogout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.router.navigate([ADMIN_ROUTES.AUTH_LOGIN]);
  }

  /**
   * A confirmed identity does not belong to this portal. Reject it locally:
   * clear this portal's own state, but never call /auth/logout (that revokes
   * every device) and never navigate - the shared cookie and the other
   * portal's session must be left untouched.
   */
  rejectPortalIdentity(rejectedUser: User): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.portalMismatch.set(true);
    this.rejectedIdentity.set(rejectedUser);
  }

  /**
   * A refresh failed in a way that does not prove the session is dead.
   * Leaves storage and currentUserSubject untouched - only the caller's
   * pending business request should reject, not the whole session.
   */
  markTemporaryReconcileFailure(): void {
    this.temporaryReconcileFailure.set(true);
  }

  /**
   * Opens the escape hatch out of a portalMismatch dead end: local state is
   * cleared already (by rejectPortalIdentity), the shared cookie stays
   * untouched, and the login route becomes renderable again. `returnUrl` is
   * the deep-link the mismatch happened on, consumed once login succeeds.
   */
  startSwitchingAccount(returnUrl: string): void {
    this.isSwitchingAccount.set(true);
    this.pendingReturnUrl = returnUrl;
  }

  /**
   * Only the escape attempt ends - callers that want the mismatch page
   * itself dismissed should rely on a confirmed matching identity instead
   * (see the refreshToken/handleAuthSuccess resets).
   */
  cancelSwitchingAccount(): void {
    this.isSwitchingAccount.set(false);
  }

  /**
   * One-time read of the return url stored by startSwitchingAccount, falling
   * back to the dashboard when none was stored (e.g. a direct login, not a
   * switch-account escape).
   */
  consumeReturnUrl(): string {
    const url = this.pendingReturnUrl ?? ADMIN_ROUTES.DASHBOARD;
    this.pendingReturnUrl = null;
    return url;
  }

  /**
   * Foreground (visibility-triggered) reconcile - a cookie set by another
   * tab or portal can change the confirmed identity at any time, so this
   * re-probes /auth/refresh on tab focus. Uses the same three-way
   * classification as bootstrapAuthSession, via the same shared refresh
   * pipeline (dedupes with a concurrent boot probe or interceptor retry).
   */
  reconcileForeground(): void {
    this.isRefreshingSession.set(true);

    this.refreshToken()
      .pipe(finalize(() => this.isRefreshingSession.set(false)))
      .subscribe({
        next: () => {
          // Persistence and mismatch-state reset already happened in
          // refreshToken()'s own tap.
        },
        error: (error: unknown) => {
          if (isAdminPortalIdentityRejectedError(error)) {
            this.rejectPortalIdentity(error.rejectedUser);
          } else if (isTerminalRefreshFailure(error)) {
            // Confirmed dead session - only this branch may force a logout.
            this.forceLogout();
          } else {
            this.markTemporaryReconcileFailure();
          }
        },
      });
  }

  /**
   * Mandatory boot-time probe. Always calls /auth/refresh regardless of any
   * local snapshot - a stale 'admin_user' from a previous, different
   * identity is only a hint and must never be rendered as authenticated
   * before the server confirms it (fix_multiple_account_on_browser_profile.md
   * P1-9). Idempotent while a probe is already in flight.
   */
  bootstrapAuthSession(): void {
    if (this.authBootStatus() === 'checking') return;
    this.authBootStatus.set('checking');

    this.refreshToken().subscribe({
      next: () => this.authBootStatus.set('ready'),
      error: (error: unknown) => {
        if (isAdminPortalIdentityRejectedError(error)) {
          this.rejectPortalIdentity(error.rejectedUser);
          this.authBootStatus.set('ready');
        } else if (isTerminalRefreshFailure(error)) {
          // No cookie, or a revoked/expired one - a plain logged-out guest.
          // Clear directly rather than forceLogout(): the app shell hasn't
          // rendered anything yet, so there is nothing to navigate away from.
          this.clearAuthData();
          this.currentUserSubject.next(null);
          this.authBootStatus.set('ready');
        } else {
          // Network error, timeout, 5xx, malformed body, or missing user -
          // none of these prove the session is dead. Keep the snapshot.
          this.markTemporaryReconcileFailure();
          this.authBootStatus.set('retry');
        }
      },
    });
  }

  private assertAdminPortalIdentity(user: User): void {
    const hasAdminRole = user.roles?.includes(UserRole.ADMIN);
    if (!hasAdminRole) {
      throw new AdminPortalIdentityRejectedError(user);
    }
  }

  private handleAuthSuccess(authData: JwtResponse): void {
    const { user, accessToken } = authData;

    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    // NOTE: refreshToken is in HTTP-Only Cookie, not stored in localStorage

    this.currentUserSubject.next(user);
    this.temporaryReconcileFailure.set(false);
    // A confirmed matching identity closes out any earlier mismatch -
    // whether this is a first login or the tail end of a switch-account
    // escape.
    this.portalMismatch.set(false);
    this.rejectedIdentity.set(null);
    this.isSwitchingAccount.set(false);

    // Set Sentry user context — do NOT send email (PII)
    Sentry.setUser({
      id: String(user.id),
      username: `admin-${user.id}`,
      role: 'ADMIN',
    });
  }

  private createError(message: string, status: number): HttpErrorResponse {
    return new HttpErrorResponse({
      error: { message },
      status,
      statusText: message,
    });
  }

  private handleError(error: unknown): Observable<never> {
    if (isAdminPortalIdentityRejectedError(error)) {
      const errorMessage = 'Access denied. Admin privileges required.';
      this.error.set(errorMessage);
      // A plain first-time login attempt with the wrong role is just an
      // inline form error - portalMismatch stays whatever it already was.
      // But a login attempt made mid switch-account escape must close the
      // escape and fall back to the (still active) mismatch page with the
      // newly attempted identity.
      this.rejectedIdentity.set(error.rejectedUser);
      this.isSwitchingAccount.set(false);
      return throwError(() => new Error(errorMessage));
    }

    const errorMessage = this.extractErrorMessage(error as HttpErrorResponse);
    this.error.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    }

    const statusMessages: Record<number, string> = {
      401: 'Invalid username/email or password',
      403: 'Access denied. Admin privileges required.',
      404: 'Authentication service not available',
      500: 'Server error. Please try again later.',
    };

    return statusMessages[error.status] || error.statusText || 'An unexpected error occurred';
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = this.decodeToken(token);
      const isExpired = payload.exp * 1000 < Date.now();
      
      if (isExpired) {
        // Don't clear auth data here - let interceptor try refresh first
        return false;
      }
      
      return true;
    } catch {
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Check if token is expired (used by interceptor)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = this.decodeToken(token);
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Update token after refresh
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getUserFromStorage(): AdminUser | null {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): { exp: number; [key: string]: unknown } {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      throw new Error('Invalid token format');
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // NOTE: HTTP-Only Cookie cannot be cleared from JS
    // Backend clears it via Set-Cookie header in logout response
    Sentry.setUser(null);
  }

  clearError(): void {
    this.error.set(null);
  }
}