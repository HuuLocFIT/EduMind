import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============================================
// 📦 AUTH INTERFACES
// ============================================
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  userId: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'ROLE_ADMIN';
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

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
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http
      .post<AuthResponse>(
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
  private handleAuthSuccess(authData: AuthResponse): void {
    // Validate admin role
    if (!authData.roles.includes('ROLE_ADMIN')) {
      this.error.set('Access denied. Admin privileges required.');
      this.clearAuthData();
      throw new Error('Unauthorized: Admin role required');
    }

    // Store tokens and user data
    localStorage.setItem(this.TOKEN_KEY, authData.accessToken);
    if (authData.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    }
    const adminUser = this.createAdminUser(authData);
    localStorage.setItem(this.USER_KEY, JSON.stringify(adminUser));

    // Update current user
    this.currentUserSubject.next(adminUser);
  }

  private createAdminUser(authData: AuthResponse): AdminUser {
    return {
      id: authData.userId.toString(),
      username: authData.username,
      email: authData.email,
      role: 'ROLE_ADMIN',
      firstName: authData.firstName,
      lastName: authData.lastName,
    };
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