import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type {
  LoginRequest,
  JwtResponse,
  User,
} from '@edumind/shared-types';
import { UserRole } from '@edumind/shared-constants';
import { getPrimaryRole } from '@edumind/shared-types';

// Type alias for backward compatibility
export type AdminUser = User;

// ============================================
// 🔐 AUTH SERVICE
// ============================================
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

  // ============================================
  // 🔑 LOGIN
  // ============================================
  login(credentials: LoginRequest): Observable<JwtResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http
      .post<JwtResponse>(
        `${this.API_URL}/auth/login`,
        credentials
      )
      .pipe(
        tap((response) => {
          if (response) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError((error) => this.handleError(error)),
        finalize(() => this.isLoading.set(false))
      );
  }

  // ============================================
  // 🚪 LOGOUT
  // ============================================
  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ============================================
  // ✅ AUTH SUCCESS HANDLER
  // ============================================
  private handleAuthSuccess(authData: JwtResponse): void {
    const user = authData.user;

    // Validate admin role
    const primaryRole = getPrimaryRole(user);
    if (primaryRole !== UserRole.ADMIN) {
      this.error.set('Access denied. Admin privileges required.');
      this.clearAuthData();
      throw new Error('Unauthorized: Admin role required');
    }

    // Store tokens and user data
    localStorage.setItem(this.TOKEN_KEY, authData.accessToken);
    if (authData.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    // Update current user
    this.currentUserSubject.next(user);
  }

  // ============================================
  // ❌ ERROR HANDLER
  // ============================================
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error?.message) {
      // Backend error with message
      errorMessage = error.error.message;
    } else {
      // HTTP error
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid username/email or password';
          break;
        case 403:
          errorMessage = 'Access denied. Admin privileges required.';
          break;
        case 404:
          errorMessage = 'Authentication service not available';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Error: ${error.statusText || 'Unknown error'}`;
      }
    }

    this.error.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ============================================
  // 🔍 AUTH STATE CHECKS
  // ============================================
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

  // ============================================
  // 🧹 UTILITY METHODS
  // ============================================
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