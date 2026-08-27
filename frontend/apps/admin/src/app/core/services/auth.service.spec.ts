import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserRole } from '@edumind/shared-constants';
import { AUTH_ENDPOINTS, ADMIN_ROUTES } from '@edumind/shared-utils';
import type {
  LoginRequest,
  JwtResponse,
  RefreshTokenResponse,
  User,
} from '@edumind/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  // Initialize TestBed platform before all tests
  beforeAll(() => {
    // Try to get or create the testing platform
    if (!TestBed.platform) {
      // For Angular 15+, we might need to use a different approach
      // This is a workaround for Vitest compatibility
      try {
        TestBed.resetTestingModule();
      } catch {
        // Ignore if already reset
      }
    }
  });

  // Mock data
  const mockAdminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    roles: [UserRole.ADMIN],
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isEmailVerified: true,
    is2faEnabled: false,
    isTrial: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockNonAdminUser: User = {
    id: 2,
    username: 'student',
    email: 'student@example.com',
    roles: [UserRole.STUDENT],
    isActive: true,
    isEmailVerified: true,
    is2faEnabled: false,
    isTrial: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // Helper to create a valid JWT token (not expired)
  const createValidToken = (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      })
    );
    return `${header}.${payload}.signature`;
  };

  // Helper to create an expired JWT token
  const createExpiredToken = (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '1',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      })
    );
    return `${header}.${payload}.signature`;
  };

  const mockLoginResponse: JwtResponse = {
    accessToken: createValidToken(),
    tokenType: 'Bearer',
    user: mockAdminUser,
  };

  const mockRefreshResponse: RefreshTokenResponse = {
    accessToken: createValidToken(),
    tokenType: 'Bearer',
    user: mockAdminUser,
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset and configure TestBed
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created successfully', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user if no stored user', () => {
      localStorage.clear();
      const newService = TestBed.inject(AuthService);
      expect(newService.getCurrentUser()).toBeNull();
    });

    it('should initialize with stored user from localStorage', () => {
      // Reset TestBed completely to get fresh DI container
      TestBed.resetTestingModule();
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      
      const freshService = TestBed.inject(AuthService);
      expect(freshService.getCurrentUser()).toEqual(mockAdminUser);
    });

    it('should initialize currentUser$ observable', async () => {
      const user = await new Promise((resolve) => {
        service.currentUser$.subscribe((u) => {
          resolve(u);
        });
      });
      expect(user).toBeNull();
    });
  });

  describe('Login Method', () => {
    const credentials: LoginRequest = {
      usernameOrEmail: 'admin',
      password: 'password123',
    };

    it('should call login endpoint with correct credentials', () => {
      service.login(credentials).subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockLoginResponse);
    });

    it('should set withCredentials: true for cookie support', () => {
      service.login(credentials).subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`
      );
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockLoginResponse);
    });

    it('should set isLoading signal to true during login', async () => {
      // The isLoading is set when login() is called, not after subscribe
      const loginPromise = service.login(credentials).toPromise();
      
      // At this point isLoading should be true (before response)
      expect(service.isLoading()).toBe(true);
      
      // Flush to complete the observable
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      await loginPromise;
    });

    it('should set isLoading signal to false after login success', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await loginPromise;
      expect(service.isLoading()).toBe(false);
    });

    it('should set isLoading signal to false after login error', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.isLoading()).toBe(false);
    });

    it('should store access token in localStorage on success', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await loginPromise;
      expect(localStorage.getItem('admin_auth_token')).toBe(mockLoginResponse.accessToken);
    });

    it('should store user in localStorage on success', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await loginPromise;
      const storedUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
      expect(storedUser).toEqual(mockAdminUser);
    });

    it('should update currentUserSubject on success', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await loginPromise;
      expect(service.getCurrentUser()).toEqual(mockAdminUser);
    });

    it('should emit user via currentUser$ observable', async () => {
      const userUpdate = new Promise<void>((resolve) => {
        service.currentUser$.subscribe((user) => {
          if (user) {
            expect(user).toEqual(mockAdminUser);
            resolve();
          }
        });
      });

      service.login(credentials).subscribe();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await userUpdate;
    });

    it('should validate admin role and throw error if not admin', async () => {
      const nonAdminResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: mockNonAdminUser,
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(nonAdminResponse);
      
      await expect(loginPromise).rejects.toThrow('Admin privileges required');
      expect(service.error()).toContain('Admin privileges required');
    });

    it('should handle 401 Unauthorized error', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(
          { message: 'Invalid credentials' },
          { status: 401, statusText: 'Unauthorized' }
        );
      
      await expect(loginPromise).rejects.toThrow();
      // When error.error.message exists, it uses that, otherwise uses status message
      expect(service.error()).toBe('Invalid credentials');
    });

    it('should handle 403 Forbidden error (non-admin user)', async () => {
      const nonAdminResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: mockNonAdminUser,
      };
      
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(nonAdminResponse);
      
      await expect(loginPromise).rejects.toThrow('Admin privileges required');
    });

    it('should handle 404 Not Found error', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 404, statusText: 'Not Found' });
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe('Authentication service not available');
    });

    it('should handle 500 Server Error', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 500, statusText: 'Internal Server Error' });
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe('Server error. Please try again later.');
    });

    it('should handle network errors', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .error(new ProgressEvent('Network error'));
      
      await expect(loginPromise).rejects.toThrow();
    });

    it('should clear error signal on new login attempt', async () => {
      // First login attempt fails
      const firstLoginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(firstLoginPromise).rejects.toThrow();
      expect(service.error()).toBeTruthy();

      // Second login attempt should clear error
      const secondLoginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await secondLoginPromise;
      expect(service.error()).toBeNull();
    });

    it('should throw error for invalid response (null)', async () => {
      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(null);
      
      await expect(loginPromise).rejects.toThrow('Invalid response from server');
    });

    it('should extract and set error message from response', async () => {
      const errorMessage = 'Custom error message';
      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(
          { message: errorMessage },
          { status: 400, statusText: 'Bad Request' }
        );
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe(errorMessage);
    });
  });

  describe('Refresh Token Method', () => {
    it('should call refresh endpoint with empty body', () => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockRefreshResponse);
    });

    it('should set withCredentials: true for cookie', () => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`
      );
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockRefreshResponse);
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      // Start first refresh - this sets isRefreshing to true
      const firstRefresh = service.refreshToken();
      firstRefresh.subscribe(); // Subscribe to initiate the request
      
      // Now try second refresh - should fail immediately
      const secondRefresh = service.refreshToken();
      const secondRefreshPromise = secondRefresh.toPromise();
      
      // Complete the first refresh
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await expect(secondRefreshPromise).rejects.toThrow('Refresh already in progress');
    });

    it('should update access token in localStorage on success', async () => {
      const refreshPromise = service.refreshToken().toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await refreshPromise;
      expect(localStorage.getItem('admin_auth_token')).toBe(mockRefreshResponse.accessToken);
    });

    it('should update user in localStorage if provided', async () => {
      const refreshPromise = service.refreshToken().toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await refreshPromise;
      const storedUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
      expect(storedUser).toEqual(mockAdminUser);
    });

    it('should update currentUserSubject if user provided', async () => {
      const refreshPromise = service.refreshToken().toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await refreshPromise;
      expect(service.getCurrentUser()).toEqual(mockAdminUser);
    });

    it('should set isRefreshing flag correctly', async () => {
      // Start first refresh
      const firstRefreshPromise = service.refreshToken().toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await firstRefreshPromise;
      
      // After refresh completes, isRefreshing should be false
      // We can't directly access private isRefreshing, but we can test by trying another refresh
      // Second refresh should work now
      const secondRefreshPromise = service.refreshToken().toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`).flush(mockRefreshResponse);
      
      await secondRefreshPromise;
    });

    it('should handle refresh failure gracefully', async () => {
      const refreshPromise = service.refreshToken().toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      
      await expect(refreshPromise).rejects.toThrow();
    });

    it('rejects when the refresh response omits user (contract violation, no fallback)', async () => {
      const refreshResponseWithoutUser = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
      };

      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      const originalUser = service.getCurrentUser();

      const refreshPromise = service.refreshToken().toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`)
        .flush(refreshResponseWithoutUser);

      await expect(refreshPromise).rejects.toThrow();
      // User should remain unchanged since the rejected response was never adopted
      expect(service.getCurrentUser()).toEqual(originalUser);
    });
  });

  describe('Logout Method', () => {
    beforeEach(() => {
      // Set up authenticated state
      localStorage.setItem('admin_auth_token', createValidToken());
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
    });

    it('should call logout endpoint', () => {
      service.logout();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('should set withCredentials: true for cookie', () => {
      service.logout();

      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`
      );
      expect(req.request.withCredentials).toBe(true);
      req.flush({});
    });

    it('should clear auth data from localStorage', () => {
      service.logout();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`).flush({});

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
      expect(localStorage.getItem('admin_user')).toBeNull();
    });

    it('should set currentUserSubject to null', () => {
      service.logout();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`).flush({});

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should navigate to login page', () => {
      service.logout();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`).flush({});

      expect(router.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.AUTH_LOGIN]);
    });

    it('should continue logout even if API call fails', () => {
      service.logout();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      // Should still clear data and navigate
      expect(localStorage.getItem('admin_auth_token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.AUTH_LOGIN]);
    });

    it('should clear all auth-related localStorage items', () => {
      localStorage.setItem('admin_auth_token', 'token');
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      localStorage.setItem('other_data', 'should remain');

      service.logout();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`).flush({});

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
      expect(localStorage.getItem('admin_user')).toBeNull();
      expect(localStorage.getItem('other_data')).toBe('should remain');
    });
  });

  describe('Force Logout Method', () => {
    beforeEach(() => {
      localStorage.setItem('admin_auth_token', createValidToken());
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
    });

    it('should clear auth data from localStorage', () => {
      service.forceLogout();

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
      expect(localStorage.getItem('admin_user')).toBeNull();
    });

    it('should set currentUserSubject to null', () => {
      service.forceLogout();

      expect(service.getCurrentUser()).toBeNull();
    });

    it('should navigate to login page', () => {
      service.forceLogout();

      expect(router.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.AUTH_LOGIN]);
    });

    it('should not call logout API endpoint', () => {
      service.forceLogout();

      httpMock.expectNone(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`);
    });
  });

  describe('Token Management', () => {
    it('getToken() should return token from localStorage', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      expect(service.getToken()).toBe(token);
    });

    it('getToken() should return null if no token', () => {
      localStorage.clear();

      expect(service.getToken()).toBeNull();
    });

    it('setToken() should update token in localStorage', () => {
      const newToken = createValidToken();
      service.setToken(newToken);

      expect(localStorage.getItem('admin_auth_token')).toBe(newToken);
    });

    it('isTokenExpired() should return true for expired token', () => {
      const expiredToken = createExpiredToken();
      localStorage.setItem('admin_auth_token', expiredToken);

      expect(service.isTokenExpired()).toBe(true);
    });

    it('isTokenExpired() should return true for missing token', () => {
      localStorage.clear();

      expect(service.isTokenExpired()).toBe(true);
    });

    it('isTokenExpired() should return false for valid token', () => {
      const validToken = createValidToken();
      localStorage.setItem('admin_auth_token', validToken);

      expect(service.isTokenExpired()).toBe(false);
    });

    it('isTokenExpired() should handle invalid token format', () => {
      localStorage.setItem('admin_auth_token', 'invalid.token');

      expect(service.isTokenExpired()).toBe(true);
    });
  });

  describe('Authentication Status', () => {
    it('isAuthenticated() should return true when valid token exists', () => {
      const validToken = createValidToken();
      localStorage.setItem('admin_auth_token', validToken);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated() should return false when no token', () => {
      localStorage.clear();

      expect(service.isAuthenticated()).toBe(false);
    });

    it('isAuthenticated() should return false for expired token', () => {
      const expiredToken = createExpiredToken();
      localStorage.setItem('admin_auth_token', expiredToken);

      expect(service.isAuthenticated()).toBe(false);
    });

    it('isAuthenticated() should clear auth data for invalid token', () => {
      localStorage.setItem('admin_auth_token', 'invalid.token');
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));

      service.isAuthenticated();

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
      expect(localStorage.getItem('admin_user')).toBeNull();
    });

    it('isAuthenticated() should not clear auth data for expired token', () => {
      const expiredToken = createExpiredToken();
      localStorage.setItem('admin_auth_token', expiredToken);
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));

      service.isAuthenticated();

      // Should not clear - let interceptor handle refresh
      expect(localStorage.getItem('admin_auth_token')).toBe(expiredToken);
      expect(localStorage.getItem('admin_user')).toBeTruthy();
    });
  });

  describe('User Management', () => {
    it('getCurrentUser() should return current user', () => {
      // Reset TestBed to get fresh service with localStorage
      TestBed.resetTestingModule();
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      
      const freshService = TestBed.inject(AuthService);
      expect(freshService.getCurrentUser()).toEqual(mockAdminUser);
    });

    it('getCurrentUser() should return null when not authenticated', () => {
      localStorage.clear();

      expect(service.getCurrentUser()).toBeNull();
    });

    it('currentUser$ should emit user updates', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const userUpdate = new Promise<void>((resolve) => {
        let emissionCount = 0;
        service.currentUser$.subscribe((user) => {
          emissionCount++;
          if (emissionCount === 2 && user) {
            // Second emission should have the user
            expect(user).toEqual(mockAdminUser);
            resolve();
          }
        });
      });

      service.login(credentials).subscribe();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await userUpdate;
    });

    it('should restore user from localStorage on initialization', () => {
      // Reset TestBed to get fresh service with localStorage
      TestBed.resetTestingModule();
      localStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      
      const freshService = TestBed.inject(AuthService);
      expect(freshService.getCurrentUser()).toEqual(mockAdminUser);
    });
  });

  describe('Error Handling', () => {
    it('clearError() should clear error signal', () => {
      service.error.set('Some error');
      service.clearError();

      expect(service.error()).toBeNull();
    });

    it('should extract error message from HttpErrorResponse', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(
          { message: 'Custom error message' },
          { status: 400, statusText: 'Bad Request' }
        );
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe('Custom error message');
    });

    it('should extract error message from ErrorEvent', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      const errorEvent = new ErrorEvent('Network error', {
        message: 'Network request failed',
      });
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .error(errorEvent);
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBeTruthy();
    });

    it('should use status-specific error messages', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe('Invalid username/email or password');
    });

    it('should fallback to statusText if no message', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 418, statusText: 'Custom Status Text' });
      
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toBe('Custom Status Text');
    });

    it('should handle unknown error status codes', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock
        .expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`)
        .flush(null, { status: 999, statusText: '' });
      
      await expect(loginPromise).rejects.toThrow();
      // When statusText is empty, HttpClient returns 'Unknown Error'
      expect(service.error()).toBe('Unknown Error');
    });
  });

  describe('Token Decoding', () => {
    it('should decode valid JWT token', () => {
      const validToken = createValidToken();
      localStorage.setItem('admin_auth_token', validToken);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should throw error for invalid token format', () => {
      localStorage.setItem('admin_auth_token', 'not.a.valid.token.format');

      expect(service.isTokenExpired()).toBe(true);
    });

    it('should handle malformed token gracefully', () => {
      localStorage.setItem('admin_auth_token', 'invalid');

      expect(service.isTokenExpired()).toBe(true);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Admin Role Validation', () => {
    it('should accept user with ADMIN role', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(mockLoginResponse);
      
      await loginPromise;
      expect(service.getCurrentUser()?.roles).toContain(UserRole.ADMIN);
    });

    it('should reject user with STUDENT role', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'student',
        password: 'password123',
      };

      const nonAdminResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: mockNonAdminUser,
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(nonAdminResponse);
      
      await expect(loginPromise).rejects.toThrow('Admin privileges required');
    });

    it('should reject user with TEACHER role', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'teacher',
        password: 'password123',
      };

      const teacherUser: User = {
        id: 3,
        username: 'teacher',
        email: 'teacher@example.com',
        roles: [UserRole.TEACHER],
        isActive: true,
        isEmailVerified: true,
        is2faEnabled: false,
        isTrial: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const teacherResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: teacherUser,
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(teacherResponse);
      
      await expect(loginPromise).rejects.toThrow('Admin privileges required');
    });

    it('should reject user with no roles', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'norole',
        password: 'password123',
      };

      const noRoleUser: User = {
        id: 4,
        username: 'norole',
        email: 'norole@example.com',
        roles: [],
        isActive: true,
        isEmailVerified: true,
        is2faEnabled: false,
        isTrial: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const noRoleResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: noRoleUser,
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(noRoleResponse);
      
      await expect(loginPromise).rejects.toThrow('Admin privileges required');
    });

    it('should accept user with ADMIN as secondary role', async () => {
      const credentials: LoginRequest = {
        usernameOrEmail: 'multirole',
        password: 'password123',
      };

      const multiRoleUser: User = {
        id: 5,
        username: 'multirole',
        email: 'multirole@example.com',
        roles: [UserRole.TEACHER, UserRole.ADMIN], // ADMIN is secondary role
        isActive: true,
        isEmailVerified: true,
        is2faEnabled: false,
        isTrial: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const multiRoleResponse: JwtResponse = {
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: multiRoleUser,
      };

      const loginPromise = service.login(credentials).toPromise();
      httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`).flush(multiRoleResponse);
      
      await loginPromise;
      expect(service.getCurrentUser()?.roles).toContain(UserRole.ADMIN);
    });
  });

  describe('localStorage Edge Cases', () => {
    it('should handle localStorage quota exceeded', () => {
      // Mock setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const token = createValidToken();
      // AuthService.setToken() does NOT wrap setItem in try-catch, so it WILL throw
      expect(() => service.setToken(token)).toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle localStorage disabled', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const token = createValidToken();
      // AuthService.setToken() does NOT wrap setItem in try-catch, so it WILL throw
      expect(() => service.setToken(token)).toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle malformed JSON in localStorage', () => {
      // Reset TestBed to get fresh service with localStorage state
      TestBed.resetTestingModule();
      localStorage.setItem('admin_user', 'invalid-json{');
      
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      
      const freshService = TestBed.inject(AuthService);
      expect(freshService.getCurrentUser()).toBeNull();
    });

    it('should handle null values in localStorage', () => {
      // Reset TestBed to get fresh service with localStorage state
      TestBed.resetTestingModule();
      localStorage.setItem('admin_user', 'null');
      
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: vi.fn() } },
        ],
      });
      
      const freshService = TestBed.inject(AuthService);
      expect(freshService.getCurrentUser()).toBeNull();
    });

    it('should handle empty string values', () => {
      localStorage.setItem('admin_auth_token', '');
      localStorage.setItem('admin_user', '');

      expect(service.getToken()).toBe('');
      // Empty string JSON.parse will throw, so user should be null from service initialization
    });
  });
});

