import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './auth.service';

const { mockRefreshAuthSession } = vi.hoisted(() => ({
  mockRefreshAuthSession: vi.fn(),
}));

// Mock apiClient + the refresh pipeline (refreshToken delegates to refreshAuthSession)
vi.mock('./api-client.service.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  refreshAuthSession: mockRefreshAuthSession,
}));

// Mock shared-utils
vi.mock('@edumind/shared-utils', () => ({
  AUTH_ENDPOINTS: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    VALIDATE_RESET_TOKEN: '/auth/password/validate-token',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    SETUP_2FA: '/auth/2fa/setup',
    VERIFY_2FA: '/auth/2fa/verify',
    LOGIN_2FA: '/auth/login/2fa',
    DISABLE_2FA: '/auth/2fa/disable',
    BACKUP_CODES: '/auth/2fa/backup-codes',
    OAUTH2_CALLBACK: (provider: string) => `/oauth2/callback/${provider}`,
  },
  USER_ENDPOINTS: {
    ME: '/users/me',
    UPDATE_PROFILE: () => '/users/profile',
    CHANGE_PASSWORD: '/users/password',
    DELETE_ACCOUNT: '/users/account',
  },
  getOAuth2Url: vi.fn((provider: string, apiUrl: string) => `${apiUrl}/oauth2/authorize/${provider}`),
  API_URL: 'http://localhost:8080/api',
}));

import { apiClient } from './api-client.service.js';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('signup', () => {
    it('should call signup endpoint with correct data', async () => {
      const signupData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
      };
      const mockResponse = { data: { success: true, message: 'Registration successful' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.signup(signupData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', signupData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('login', () => {
    it('should call login endpoint with credentials', async () => {
      const credentials = { usernameOrEmail: 'testuser', password: 'password' };
      const mockResponse = {
        data: {
          accessToken: 'jwt-token',
          user: { id: 1, username: 'testuser' },
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should return 2FA response when 2FA is required', async () => {
      const credentials = { usernameOrEmail: 'testuser', password: 'password' };
      const mockResponse = {
        data: {
          requires2FA: true,
          email: 'test@example.com',
          message: 'Two-factor authentication required',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(result).toHaveProperty('requires2FA', true);
    });
  });

  describe('logout', () => {
    it('should call logout endpoint and clear localStorage', async () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('auth-storage', 'data');

      const mockResponse = { data: { success: true, message: 'Logged out' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('auth-storage')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should delegate to the refreshAuthSession pipeline', async () => {
      const mockResult = { accessToken: 'new-token', tokenType: 'Bearer', user: { id: 1 } };
      mockRefreshAuthSession.mockResolvedValue(mockResult);

      const result = await authService.refreshToken();

      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('forgotPassword', () => {
    it('should call forgot password endpoint', async () => {
      const mockResponse = { data: { success: true, message: 'Email sent' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.forgotPassword({ email: 'test@example.com' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/password/forgot', { email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resetPassword', () => {
    it('should call reset password endpoint', async () => {
      const resetData = { token: 'reset-token', newPassword: 'NewPass123!', confirmPassword: 'NewPass123!' };
      const mockResponse = { data: { success: true, message: 'Password reset' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.resetPassword(resetData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/password/reset', resetData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('validateResetToken', () => {
    it('should call validate-token endpoint with correct URL and params on 200', async () => {
      const mockResponse = { data: { email: 'test@example.com' } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authService.validateResetToken('reset-token');

      expect(apiClient.get).toHaveBeenCalledWith('/auth/password/validate-token', {
        params: { token: 'reset-token' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate errors without catching them', async () => {
      const error = { message: 'Bad Request', status: 400 };
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(authService.validateResetToken('expired-token')).rejects.toEqual(error);
    });
  });

  describe('verifyEmail', () => {
    it('should call verify email endpoint with token', async () => {
      const mockResponse = { data: { success: true, message: 'Email verified' } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authService.verifyEmail('verification-token');

      expect(apiClient.get).toHaveBeenCalledWith('/auth/verify-email', { params: { token: 'verification-token' } });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resendVerification', () => {
    it('should call resend verification endpoint', async () => {
      const mockResponse = { data: { success: true, message: 'Verification email sent' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.resendVerification({ email: 'test@example.com' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('2FA methods', () => {
    it('setup2FA should call setup endpoint', async () => {
      const mockResponse = { data: { secret: 'JBSWY3DPEHPK3PXP', qrCodeUrl: 'data:image/png...' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.setup2FA();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/setup');
      expect(result).toEqual(mockResponse.data);
    });

    it('verify2FASetup should call verify endpoint with code and secret', async () => {
      const verifyData = { code: '123456', secret: 'SECRET123' };
      const mockResponse = { data: { success: true, message: '2FA verified' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.verify2FASetup(verifyData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/verify', verifyData);
      expect(result).toEqual(mockResponse.data);
    });

    it('loginWith2FA should call 2FA login endpoint', async () => {
      const mockResponse = { data: { accessToken: '2fa-jwt-token' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const loginData = {
        usernameOrEmail: 'test@example.com',
        password: 'Password123!',
        code: '123456',
      };
      const result = await authService.loginWith2FA(loginData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login/2fa', loginData);
      expect(result).toEqual(mockResponse.data);
    });

    it('disable2FA should call disable endpoint', async () => {
      const mockResponse = { data: { success: true, message: '2FA disabled' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.disable2FA({ password: 'password', code: '123456' });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/disable', { password: 'password', code: '123456' });
      expect(result).toEqual(mockResponse.data);
    });

    it('getBackupCodes should call backup codes endpoint', async () => {
      const mockResponse = { data: { backupCodes: ['CODE1', 'CODE2'] } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.getBackupCodes();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/backup-codes');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Helper methods', () => {
    it('getCurrentUser should return user from localStorage', () => {
      const user = { id: 1, username: 'testuser' };
      localStorage.setItem('user', JSON.stringify(user));

      expect(authService.getCurrentUser()).toEqual(user);
    });

    it('getCurrentUser should return null if no user', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('getAccessToken should return token from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');

      expect(authService.getAccessToken()).toBe('test-token');
    });

    it('getAccessToken should return null if no token', () => {
      expect(authService.getAccessToken()).toBeNull();
    });

    it('isAuthenticated should return true when token exists', () => {
      localStorage.setItem('accessToken', 'test-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated should return false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('clearAuth should remove all auth items from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('auth-storage', 'data');

      authService.clearAuth();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('auth-storage')).toBeNull();
    });
  });

  describe('OAuth2 methods', () => {
    it('getGoogleOAuthUrl should return correct URL', () => {
      const url = authService.getGoogleOAuthUrl();

      expect(url).toBe('http://localhost:8080/api/oauth2/authorize/google');
    });

    it('getFacebookOAuthUrl should return correct URL', () => {
      const url = authService.getFacebookOAuthUrl();

      expect(url).toBe('http://localhost:8080/api/oauth2/authorize/facebook');
    });

    it('handleOAuth2Callback should call callback endpoint with code', async () => {
      const provider = 'google';
      const code = 'auth-code-123';
      const mockResponse = { data: { accessToken: 'oauth-token', user: { id: 1 } } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authService.handleOAuth2Callback(provider, code);

      // Verify strict parameter usage (code vs token)
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`/oauth2/callback/${provider}`),
        { params: { code } }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('User profile methods', () => {
    it('fetchCurrentUser should call /users/me endpoint', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

      const result = await authService.fetchCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });

    it('updateProfile should call update endpoint and update localStorage', async () => {
      const updateData = { firstName: 'Updated', lastName: 'User' };
      const mockUpdatedUser = { id: 1, username: 'testuser', firstName: 'Updated', lastName: 'User' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: mockUpdatedUser });

      const result = await authService.updateProfile(updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/users/profile', updateData);
      expect(result).toEqual(mockUpdatedUser);
      expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(mockUpdatedUser);
    });

    it('changePassword should call change password endpoint', async () => {
      const passwordData = { currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' };
      const mockResponse = { data: { success: true, message: 'Password changed' } };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.changePassword(passwordData);

      expect(apiClient.post).toHaveBeenCalledWith('/users/password', passwordData);
      expect(result).toEqual(mockResponse.data);
    });

    it('deleteAccount should call delete endpoint and clear auth', async () => {
      localStorage.setItem('accessToken', 'token');
      const mockResponse = { data: { success: true, message: 'Account deleted' } };
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse);

      await authService.deleteAccount();

      expect(apiClient.delete).toHaveBeenCalledWith('/users/account');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });
  describe('Error Handling', () => {
    it('should propagate API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(authService.login({ usernameOrEmail: 'test', password: 'bad' }))
        .rejects.toThrow('API Error');
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(authService.fetchCurrentUser())
        .rejects.toThrow('Network Error');
    });

    describe('HTTP Status Codes', () => {
      it('should handle 400 Bad Request errors', async () => {
        const error = new Error('Bad Request');
        (error as any).response = { status: 400, data: { message: 'Invalid request' } };
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(authService.login({ usernameOrEmail: 'test', password: 'bad' }))
          .rejects.toThrow('Bad Request');
      });

      it('should handle 401 Unauthorized errors', async () => {
        const error = new Error('Unauthorized');
        (error as any).response = { status: 401, data: { message: 'Invalid credentials' } };
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(authService.login({ usernameOrEmail: 'test', password: 'wrong' }))
          .rejects.toThrow('Unauthorized');
      });

      it('should handle 403 Forbidden errors', async () => {
        const error = new Error('Forbidden');
        (error as any).response = { status: 403, data: { message: 'Access denied' } };
        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(authService.fetchCurrentUser())
          .rejects.toThrow('Forbidden');
      });

      it('should handle 404 Not Found errors', async () => {
        const error = new Error('Not Found');
        (error as any).response = { status: 404, data: { message: 'Resource not found' } };
        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(authService.verifyEmail('invalid-token'))
          .rejects.toThrow('Not Found');
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal Server Error');
        (error as any).response = { status: 500, data: { message: 'Server error' } };
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(authService.signup({
          username: 'test',
          email: 'test@example.com',
          password: 'Password123!',
        })).rejects.toThrow('Internal Server Error');
      });
    });

    describe('Timeout Errors', () => {
      it('should handle timeout errors', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        vi.mocked(apiClient.post).mockRejectedValue(timeoutError);

        await expect(authService.login({ usernameOrEmail: 'test', password: 'test' }))
          .rejects.toThrow('Request timeout');
      });

      it('should handle timeout errors during OAuth2 callback', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        vi.mocked(apiClient.get).mockRejectedValue(timeoutError);

        await expect(authService.handleOAuth2Callback('google', 'code'))
          .rejects.toThrow('Request timeout');
      });
    });

    describe('Malformed Responses', () => {
      it('should handle responses with missing data', async () => {
        const mockResponse = { data: null };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse as any);

        const result = await authService.login({ usernameOrEmail: 'test', password: 'test' });
        // Should handle gracefully or throw based on implementation
        expect(result).toBeDefined();
      });

      it('should handle responses with unexpected structure', async () => {
        const mockResponse = { data: { unexpected: 'structure' } };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse as any);

        const result = await authService.login({ usernameOrEmail: 'test', password: 'test' });
        expect(result).toBeDefined();
      });

      it('should handle null responses', async () => {
        vi.mocked(apiClient.post).mockResolvedValue(null as any);

        await expect(authService.login({ usernameOrEmail: 'test', password: 'test' }))
          .rejects.toThrow();
      });

      it('should handle undefined responses', async () => {
        vi.mocked(apiClient.post).mockResolvedValue(undefined as any);

        await expect(authService.login({ usernameOrEmail: 'test', password: 'test' }))
          .rejects.toThrow();
      });
    });

    describe('Error Propagation', () => {
      it('should propagate errors from all endpoints', async () => {
        const error = new Error('Service error');
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(authService.forgotPassword({ email: 'test@example.com' }))
          .rejects.toThrow('Service error');

        await expect(authService.resetPassword({
          token: 'token',
          newPassword: 'pass',
          confirmPassword: 'pass',
        })).rejects.toThrow('Service error');

        await expect(authService.resendVerification({ email: 'test@example.com' }))
          .rejects.toThrow('Service error');
      });

      it('should propagate errors from GET endpoints', async () => {
        const error = new Error('GET error');
        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(authService.verifyEmail('token'))
          .rejects.toThrow('GET error');

        await expect(authService.fetchCurrentUser())
          .rejects.toThrow('GET error');
      });
    });
  });
});
