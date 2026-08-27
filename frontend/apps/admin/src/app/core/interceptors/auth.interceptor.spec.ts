import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AUTH_ENDPOINTS } from '@edumind/shared-utils';
import { environment } from '../../../environments/environment';
import { UserRole } from '@edumind/shared-constants';
import type { User } from '@edumind/shared-types';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  // Helper to create a valid JWT token
  const createValidToken = (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    return `${header}.${payload}.signature`;
  };

  const mockUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    roles: [UserRole.ADMIN],
    isActive: true,
    isEmailVerified: true,
    is2faEnabled: false,
    isTrial: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
          },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Request Interception', () => {
    it('should add Authorization header for non-auth endpoints', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      httpClient.get('/api/users').subscribe();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({});
    });

    it('should not add Authorization header for login endpoint', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      httpClient.post(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`, {}).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should not add Authorization header for register endpoint', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      httpClient.post(`${environment.apiUrl}/auth/register`, {}).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should not add Authorization header for refresh endpoint', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      httpClient.post(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`, {}).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should set withCredentials: true for all requests', () => {
      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.withCredentials).toBe(true);
      req.flush({});
    });

    it('should clone request correctly without mutating original', () => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.url).toBe('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should not add Authorization header when no token exists', () => {
      localStorage.clear();

      httpClient.get('/api/users').subscribe();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('Response Transformation', () => {
    it('should unwrap API response using unwrapApiResponse helper', async () => {
      // unwrapApiResponse only unwraps responses with status and success (ApiResponse envelope)
      const wrappedResponse = {
        status: 200,
        success: true,
        data: { id: 1, name: 'Test' },
      };

      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.flush(wrappedResponse);

      const response = await promise;
      expect(response).toEqual({ id: 1, name: 'Test' });
    });

    it('should return original response if no unwrapping needed', async () => {
      const directResponse = { id: 1, name: 'Test' };

      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.flush(directResponse);

      const response = await promise;
      expect(response).toEqual(directResponse);
    });

    it('should handle HttpResponse events correctly', async () => {
      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.flush({ test: true });

      const response = await promise;
      expect(response).toBeDefined();
    });

    it('should handle non-HttpResponse events correctly', () => {
      // This test verifies the interceptor doesn't break on non-response events
      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      req.flush({});
    });
  });

  describe('Token Refresh on 401', () => {
    beforeEach(() => {
      const token = createValidToken();
      localStorage.setItem('admin_auth_token', token);
    });

    it('should attempt token refresh on 401 error', async () => {
      const refreshResponse = {
        accessToken: createValidToken(),
        user: mockUser,
      };

      const promise = httpClient.get('/api/protected').toPromise();

      // First request fails with 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh token request should be made
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // Retry request should be made with new token
      const retryReq = httpMock.expectOne('/api/protected');
      expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${refreshResponse.accessToken}`);
      retryReq.flush({ success: true });

      await promise;
    });

    it('should not refresh token for auth endpoints on 401', () => {
      const refreshSpy = vi.spyOn(authService, 'refreshToken');

      httpClient.post(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`, {}).subscribe({
        error: () => {
          // Expected
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Should not attempt refresh for auth endpoints
      expect(refreshSpy).not.toHaveBeenCalled();
      httpMock.expectNone(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
    });

    it('should retry original request with new token after refresh', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        user: mockUser,
      };

      const promise = httpClient.get('/api/protected').toPromise();

      // First request fails with 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh succeeds
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // Retry request succeeds with new token
      const retryReq = httpMock.expectOne('/api/protected');
      expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      retryReq.flush({ data: 'success' });

      const response = await promise;
      expect(response).toEqual({ data: 'success' });
    });

    it('should handle concurrent 401 errors by queuing requests', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        user: mockUser,
      };

      // Make two concurrent requests
      const promise1 = httpClient.get('/api/resource1').toPromise();
      const promise2 = httpClient.get('/api/resource2').toPromise();

      // Both fail with 401
      const req1 = httpMock.expectOne('/api/resource1');
      const req2 = httpMock.expectOne('/api/resource2');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Only one refresh should be made
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // Both requests should be retried with new token
      const retryReq1 = httpMock.expectOne('/api/resource1');
      const retryReq2 = httpMock.expectOne('/api/resource2');
      expect(retryReq1.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      expect(retryReq2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      retryReq1.flush({ data: 'resource1' });
      retryReq2.flush({ data: 'resource2' });

      await Promise.all([promise1, promise2]);
    });

    it('rejects the portal identity instead of forcing logout when refresh returns a non-admin user', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const rejectSpy = vi.spyOn(authService, 'rejectPortalIdentity');
      const nonAdminUser: User = { ...mockUser, roles: [UserRole.STUDENT] };

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush({
        accessToken: createValidToken(),
        tokenType: 'Bearer',
        user: nonAdminUser,
      });

      await promise;

      expect(rejectSpy).toHaveBeenCalledWith(nonAdminUser);
      expect(forceLogoutSpy).not.toHaveBeenCalled();
      httpMock.expectNone(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGOUT}`);
    });

    it('should force logout only for a terminal refresh failure (ERR_2004 - dead/revoked session)', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const markTemporarySpy = vi.spyOn(authService, 'markTemporaryReconcileFailure');

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      // First request fails with 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh fails with the terminal error code
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(
        { message: 'Refresh token invalid', status: 403, timestamp: '2026-01-01T00:00:00Z', errorCode: 'ERR_2004' },
        { status: 403, statusText: 'Forbidden' }
      );

      await promise;

      expect(forceLogoutSpy).toHaveBeenCalled();
      expect(markTemporarySpy).not.toHaveBeenCalled();
    });

    it('marks a temporary reconcile failure (not forceLogout) when refresh fails without the terminal error code', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const markTemporarySpy = vi.spyOn(authService, 'markTemporaryReconcileFailure');
      localStorage.setItem('admin_auth_token', createValidToken());
      localStorage.setItem('admin_user', JSON.stringify(mockUser));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh itself fails with a plain 401 - no errorCode, so it doesn't prove the session is dead
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      await promise;

      expect(markTemporarySpy).toHaveBeenCalled();
      expect(forceLogoutSpy).not.toHaveBeenCalled();
      // Snapshot must survive a temporary failure
      expect(localStorage.getItem('admin_auth_token')).not.toBeNull();
      expect(localStorage.getItem('admin_user')).not.toBeNull();
    });

    it('marks a temporary reconcile failure when the refresh request errors at the network level', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const markTemporarySpy = vi.spyOn(authService, 'markTemporaryReconcileFailure');

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.error(new ProgressEvent('Network error'));

      await promise;

      expect(markTemporarySpy).toHaveBeenCalled();
      expect(forceLogoutSpy).not.toHaveBeenCalled();
    });

    it('marks a temporary reconcile failure when refresh returns a 5xx', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const markTemporarySpy = vi.spyOn(authService, 'markTemporaryReconcileFailure');

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(null, { status: 503, statusText: 'Service Unavailable' });

      await promise;

      expect(markTemporarySpy).toHaveBeenCalled();
      expect(forceLogoutSpy).not.toHaveBeenCalled();
    });

    it('marks a temporary reconcile failure when refresh succeeds at the HTTP level but the response omits user (schema contract violation)', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');
      const markTemporarySpy = vi.spyOn(authService, 'markTemporaryReconcileFailure');

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const promise = httpClient.get('/api/protected').toPromise().catch(() => {});

      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush({ accessToken: createValidToken(), tokenType: 'Bearer' });

      await promise;

      expect(markTemporarySpy).toHaveBeenCalled();
      expect(forceLogoutSpy).not.toHaveBeenCalled();
    });

    it('should propagate refresh error if refresh fails', async () => {
      const promise = httpClient.get('/api/protected').toPromise();

      // First request fails with 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh fails
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow();
    });

    it('should transform retried request response correctly', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        user: mockUser,
      };
      // unwrapApiResponse only unwraps responses with status and success (ApiResponse envelope)
      const wrappedResponse = {
        status: 200,
        success: true,
        data: { id: 1, name: 'Test' },
      };

      const promise = httpClient.get('/api/protected').toPromise();

      // First request fails with 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh succeeds
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // Retry request with wrapped response
      const retryReq = httpMock.expectOne('/api/protected');
      retryReq.flush(wrappedResponse);

      const response = await promise;
      expect(response).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('Error Handling', () => {
    it('should propagate non-401 errors without refresh attempt', async () => {
      const refreshSpy = vi.spyOn(authService, 'refreshToken');

      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      await expect(promise).rejects.toThrow();
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('Network error'));

      await expect(promise).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('timeout'));

      await expect(promise).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      const promise = httpClient.get('/api/test').toPromise();

      const req = httpMock.expectOne('/api/test');
      req.flush(null, { status: 400, statusText: 'Bad Request' });

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Multiple Concurrent Requests', () => {
    it('should queue multiple requests during refresh', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        user: mockUser,
      };

      // Make three concurrent requests
      const promise1 = httpClient.get('/api/resource1').toPromise();
      const promise2 = httpClient.get('/api/resource2').toPromise();
      const promise3 = httpClient.get('/api/resource3').toPromise();

      // All fail with 401
      const req1 = httpMock.expectOne('/api/resource1');
      const req2 = httpMock.expectOne('/api/resource2');
      const req3 = httpMock.expectOne('/api/resource3');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });
      req3.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Only one refresh should be made
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // All requests should be retried
      const retryReq1 = httpMock.expectOne('/api/resource1');
      const retryReq2 = httpMock.expectOne('/api/resource2');
      const retryReq3 = httpMock.expectOne('/api/resource3');
      retryReq1.flush({ data: '1' });
      retryReq2.flush({ data: '2' });
      retryReq3.flush({ data: '3' });

      await Promise.all([promise1, promise2, promise3]);
    });

    it('should handle refresh failure for queued requests', async () => {
      const forceLogoutSpy = vi.spyOn(authService, 'forceLogout');

      // Make two concurrent requests that will both fail with 401
      // The first one triggers refresh, the second one queues
      const promise1 = httpClient.get('/api/resource1').toPromise();
      
      // Small delay to ensure first request triggers refresh before second
      await new Promise(resolve => setTimeout(resolve, 10));
      httpClient.get('/api/resource2').toPromise();

      // Both fail with 401
      const req1 = httpMock.expectOne('/api/resource1');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      
      const req2 = httpMock.expectOne('/api/resource2');
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Refresh fails with the terminal error code - first request should fail, second will be queued
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(
        { message: 'Refresh token invalid', status: 403, timestamp: '2026-01-01T00:00:00Z', errorCode: 'ERR_2004' },
        { status: 403, statusText: 'Forbidden' }
      );

      // First request should fail immediately
      await expect(promise1).rejects.toThrow();

      // Second request is queued and waiting for token that will never come
      // In the current implementation, it will wait indefinitely
      // We test that forceLogout was called
      expect(forceLogoutSpy).toHaveBeenCalled();
      
      // Cancel the second promise to avoid hanging
      // Note: This tests the current behavior - queued requests hang on refresh failure
      // This might be a bug that should be fixed in the interceptor
    });

    it('joins a direct AuthService.refreshToken() caller (boot/focus reconcile) with an interceptor-triggered refresh into one HTTP request', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        tokenType: 'Bearer',
        user: mockUser,
      };

      // Simulate a boot/focus reconcile calling the shared pipeline directly
      const directRefreshPromise = authService.refreshToken().toPromise();

      // Meanwhile a business request gets 401'd and goes through the interceptor's refresh path
      const promise = httpClient.get('/api/protected').toPromise();
      const req = httpMock.expectOne('/api/protected');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Only one refresh request should be in flight, serving both callers
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      const retryReq = httpMock.expectOne('/api/protected');
      expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      retryReq.flush({ success: true });

      const [directResult] = await Promise.all([directRefreshPromise, promise]);
      expect(directResult).toEqual(refreshResponse);
    });

    it('should not deadlock on concurrent refresh attempts', async () => {
      const newToken = createValidToken();
      const refreshResponse = {
        accessToken: newToken,
        user: mockUser,
      };

      // Make multiple requests that will trigger refresh
      const promise1 = httpClient.get('/api/resource1').toPromise();
      const promise2 = httpClient.get('/api/resource2').toPromise();

      // Both fail with 401
      const req1 = httpMock.expectOne('/api/resource1');
      const req2 = httpMock.expectOne('/api/resource2');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Only one refresh should occur
      const refreshReq = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REFRESH}`);
      refreshReq.flush(refreshResponse);

      // Both should be retried
      const retryReq1 = httpMock.expectOne('/api/resource1');
      const retryReq2 = httpMock.expectOne('/api/resource2');
      retryReq1.flush({ data: '1' });
      retryReq2.flush({ data: '2' });

      await Promise.all([promise1, promise2]);
    });
  });
});

