import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import {
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
          this.validateAdminRole(validated.user);
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
          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
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

  private validateAdminRole(user: User): void {
    const hasAdminRole = user.roles?.includes(UserRole.ADMIN);
    if (!hasAdminRole) {
      throw this.createError('Access denied. Admin privileges required.', 403);
    }
  }

  private handleAuthSuccess(authData: JwtResponse): void {
    const { user, accessToken } = authData;

    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    // NOTE: refreshToken is in HTTP-Only Cookie, not stored in localStorage

    this.currentUserSubject.next(user);

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

  private handleError(error: HttpErrorResponse): Observable<never> {
    const errorMessage = this.extractErrorMessage(error);
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