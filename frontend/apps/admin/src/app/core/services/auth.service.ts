import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { environment } from '@admin/environments/environment';
import type {
  LoginRequest,
  JwtResponse,
  User,
} from '@edumind/shared-types';
import { UserRole } from '@edumind/shared-constants';
import { getPrimaryRole, AUTH_ENDPOINTS, ADMIN_ROUTES } from '@edumind/shared-utils';

export type AdminUser = User;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'admin_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'admin_refresh_token';
  private readonly USER_KEY = 'admin_user';

  // Signals for reactive state
  isLoading = signal(false);
  error = signal<string | null>(null);

  // BehaviorSubject for current user
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<JwtResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http
      .post<JwtResponse>(`${this.API_URL}${AUTH_ENDPOINTS.LOGIN}`, credentials)
      .pipe(
        switchMap((response) => {
          if (!response) {
            throw this.createError('Invalid response from server', 500);
          }

          this.validateAdminRole(response.user);
          this.handleAuthSuccess(response);
          return of(response);
        }),
        catchError((error) => this.handleError(error)),
        finalize(() => this.isLoading.set(false))
      );
  }

  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.router.navigate([ADMIN_ROUTES.AUTH_LOGIN]);
  }

  private validateAdminRole(user: User): void {
    const primaryRole = getPrimaryRole(user);
    if (primaryRole !== UserRole.ADMIN) {
      throw this.createError('Access denied. Admin privileges required.', 403);
    }
  }

  private handleAuthSuccess(authData: JwtResponse): void {
    const { user, accessToken, refreshToken } = authData;

    localStorage.setItem(this.TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    this.currentUserSubject.next(user);
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
    // Backend error with message
    if (error.error?.message) {
      return error.error.message;
    }

    // Client-side error
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    }

    // HTTP status-based messages
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

    // Check if token is expired
    try {
      const payload = this.decodeToken(token);
      const isExpired = payload.exp * 1000 < Date.now();
      
      if (isExpired) {
        this.clearAuthData();
        return false;
      }
      
      return true;
    } catch {
      this.clearAuthData();
      return false;
    }
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private getUserFromStorage(): AdminUser | null {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      throw new Error('Invalid token format');
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  clearError(): void {
    this.error.set(null);
  }
}