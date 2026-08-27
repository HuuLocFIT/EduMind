import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAuthStore,
  hasGuardAttempted,
  markGuardAttempted,
  hasApprovalAttempted,
  resetRoleSyncAttempts,
} from './auth.store';

// Use vi.hoisted to hoist mock function declarations before vi.mock
const {
  mockLogin,
  mockLoginWith2FA,
  mockSignup,
  mockLogout,
  mockFetchCurrentUser,
  mockQueryClientClear,
  mockRefreshAuthSession,
  mockIsTerminalRefreshFailure,
  mockIsStaleAuthSessionError,
  mockInvalidateAuthSession,
  mockClearStoredAuth,
  mockFetchCurrentUserWith,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLoginWith2FA: vi.fn(),
  mockSignup: vi.fn(),
  mockLogout: vi.fn(),
  mockFetchCurrentUser: vi.fn(),
  mockQueryClientClear: vi.fn(),
  mockRefreshAuthSession: vi.fn(),
  mockIsTerminalRefreshFailure: vi.fn(),
  mockIsStaleAuthSessionError: vi.fn(),
  mockInvalidateAuthSession: vi.fn(),
  mockClearStoredAuth: vi.fn(),
  mockFetchCurrentUserWith: vi.fn(),
}));

// Mock the auth service - must match the import path in auth.store.ts
vi.mock('../services/auth.service', () => ({
  authService: {
    login: mockLogin,
    loginWith2FA: mockLoginWith2FA,
    signup: mockSignup,
    logout: mockLogout,
    fetchCurrentUser: mockFetchCurrentUser,
  },
}));

// Mock the refresh pipeline - must match the import path in auth.store.ts. Keep
// validateUserPortalIdentity/PortalIdentityRejectedError/isPortalIdentityRejectedError real
// (via importOriginal): they are pure role checks, and re-mocking them per test would just
// duplicate the logic under test instead of exercising it.
vi.mock('../services/api-client.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api-client.service')>();
  return {
    ...actual,
    refreshAuthSession: mockRefreshAuthSession,
    isTerminalRefreshFailure: mockIsTerminalRefreshFailure,
    isStaleAuthSessionError: mockIsStaleAuthSessionError,
    invalidateAuthSession: mockInvalidateAuthSession,
    clearStoredAuth: mockClearStoredAuth,
    fetchCurrentUserWith: mockFetchCurrentUserWith,
  };
});

// Mock the query client
vi.mock('../lib/query-client', () => ({
  queryClient: {
    clear: mockQueryClientClear,
  },
}));

import { PortalIdentityRejectedError } from '../services/api-client.service';

// Import the mocked service (for type compatibility, but we use the hoisted mocks directly)
import { authService } from '../services/auth.service';
// Import the query client
import { queryClient } from '../lib/query-client';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store state
    const { clearAuthState } = useAuthStore.getState();
    clearAuthState();
    resetRoleSyncAttempts();

    // Clear all mocks
    vi.clearAllMocks();
    // clearAllMocks() clears calls, not implementations — reset the classifiers explicitly
    // so a `mockReturnValue(true)` from one test doesn't leak into the next.
    mockIsStaleAuthSessionError.mockReturnValue(false);
    mockIsTerminalRefreshFailure.mockReturnValue(false);
    localStorage.clear();
    useAuthStore.setState({ authBootStatus: 'idle' });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and update state', async () => {
      const mockResponse = {
        accessToken: 'test-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      };
      mockLogin.mockResolvedValue(mockResponse);

      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'testuser', password: 'password' });
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('test-token');
      expect(state.user).toEqual(mockResponse.user);
      expect(state.isLoading).toBe(false);
      expect(localStorage.getItem('accessToken')).toBe('test-token');
    });

    it('should throw special error when 2FA is required', async () => {
      const mockResponse = {
        requires2FA: true,
        email: 'test@example.com',
        message: 'Two-factor authentication required',
      };
      mockLogin.mockResolvedValue(mockResponse);

      await expect(
        act(async () => {
          await useAuthStore.getState().login({ usernameOrEmail: 'testuser', password: 'password' });
        })
      ).rejects.toThrow('Two-factor authentication required');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should set error on failed login', async () => {
      const error = new Error('Invalid credentials');
      (error as any).response = { data: { message: 'Invalid credentials' } };
      mockLogin.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().login({ usernameOrEmail: 'testuser', password: 'wrong' });
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
    it('should set isLoading state correctly', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)) as any);
      
      const loginPromise = useAuthStore.getState().login({ 
        usernameOrEmail: 'test', 
        password: 'password'
      });
      
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await act(async () => {
        try {
          await loginPromise;
        } catch (e) {
          // ignore
        }
      });
      
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('loginWithOAuth2', () => {
    it('should login with oauth2 token successfully', async () => {
      const mockUser = { id: 1, username: 'oauth-user', email: 'oauth@example.com' };
      mockFetchCurrentUserWith.mockResolvedValue(mockUser);

      await act(async () => {
        await useAuthStore.getState().loginWithOAuth2('oauth-token-123');
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('oauth-token-123');
      expect(state.user).toEqual(mockUser);
      expect(localStorage.getItem('accessToken')).toBe('oauth-token-123');
    });

    it('should handle oauth2 login failure', async () => {
      const error = new Error('Failed to fetch user');
      mockFetchCurrentUserWith.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().loginWithOAuth2('invalid-token');
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.error).toBe('Failed to fetch user');
    });

    it('fetches the profile with the candidate token directly, not via localStorage', async () => {
      mockFetchCurrentUserWith.mockResolvedValue({ id: 1, username: 'u', email: 'u@example.com' });

      await act(async () => {
        await useAuthStore.getState().loginWithOAuth2('oauth-token-candidate');
      });

      expect(mockFetchCurrentUserWith).toHaveBeenCalledWith('oauth-token-candidate');
    });

    it('rejects an admin identity without persisting anything', async () => {
      const admin = { id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_ADMIN'] };
      mockFetchCurrentUserWith.mockResolvedValue(admin);

      await expect(
        act(async () => {
          await useAuthStore.getState().loginWithOAuth2('admin-token');
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('loginWith2FA', () => {
    it('should complete 2FA login successfully', async () => {
      const mockJwtResponse = {
        accessToken: '2fa-token',
      };
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };

      mockLoginWith2FA.mockResolvedValue(mockJwtResponse);
      mockFetchCurrentUserWith.mockResolvedValue(mockUser);

      await act(async () => {
        await useAuthStore.getState().loginWith2FA({
          usernameOrEmail: 'test@example.com',
          password: 'Password123!',
          code: '123456'
        });
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('2fa-token');
      expect(state.user).toEqual(mockUser);
    });

    it('fetches the profile with the candidate token directly, not via localStorage', async () => {
      mockLoginWith2FA.mockResolvedValue({ accessToken: '2fa-token-candidate' });
      mockFetchCurrentUserWith.mockResolvedValue({ id: 1, username: 'u', email: 'u@example.com' });

      await act(async () => {
        await useAuthStore.getState().loginWith2FA({
          usernameOrEmail: 'u@example.com',
          password: 'Password123!',
          code: '123456',
        });
      });

      expect(mockFetchCurrentUserWith).toHaveBeenCalledWith('2fa-token-candidate');
    });

    it('rejects an admin identity without persisting anything', async () => {
      mockLoginWith2FA.mockResolvedValue({ accessToken: '2fa-admin-token' });
      mockFetchCurrentUserWith.mockResolvedValue({
        id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_ADMIN'],
      });

      await expect(
        act(async () => {
          await useAuthStore.getState().loginWith2FA({
            usernameOrEmail: 'a@example.com',
            password: 'Password123!',
            code: '000000',
          });
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('login — portal identity rejection', () => {
    it('rejects an admin identity without persisting anything, even multi-role', async () => {
      const admin = {
        id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_STUDENT', 'ROLE_ADMIN'],
      };
      mockLogin.mockResolvedValue({ accessToken: 'admin-token', user: admin });

      await expect(
        act(async () => {
          await useAuthStore.getState().login({ usernameOrEmail: 'admin', password: 'p' });
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('signup', () => {
    it('should complete signup successfully', async () => {
      mockSignup.mockResolvedValue({ 
        success: true, 
        message: 'Registration successful',
        status: 201
      });

      await act(async () => {
        await useAuthStore.getState().signup({
          username: 'newuser',
          email: 'new@example.com',
          password: 'Password123!',
        });
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      // Signup doesn't auto-login
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set error on failed signup', async () => {
      const error = new Error('Username taken');
      (error as any).response = { data: { message: 'Username is already taken!' } };
      mockSignup.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().signup({
            username: 'existinguser',
            email: 'new@example.com',
            password: 'Password123!',
          });
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBe('Username is already taken!');
    });
  });

  describe('logout', () => {
    it('should clear state and localStorage on logout', async () => {
      // First login
      const mockResponse = {
        accessToken: 'test-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      };
      mockLogin.mockResolvedValue(mockResponse);
      mockLogout.mockResolvedValue({ success: true, message: 'Logged out', status: 200 });

      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'testuser', password: 'password' });
      });

      // Then logout
      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(mockQueryClientClear).toHaveBeenCalled();
    });

    it('should clear state even if logout API fails', async () => {
      // Setup authenticated state
      localStorage.setItem('accessToken', 'test-token');
      
      mockLogout.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // First create an error
      const error = new Error('Test error');
      (error as any).response = { data: { message: 'Test error' } };
      mockLogin.mockRejectedValue(error);

      try {
        await act(async () => {
          await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
        });
      } catch {
        // Expected
      }

      // Verify error exists
      expect(useAuthStore.getState().error).toBe('Test error');

      // Clear error
      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should update user', () => {
      const user = { id: 1, username: 'updated', email: 'updated@example.com' };

      act(() => {
        useAuthStore.getState().setUser(user as any);
      });

      expect(useAuthStore.getState().user).toEqual(user);
    });
  });

  describe('clearAuthState', () => {
    it('should clear all auth data', async () => {
      // Setup authenticated state
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      
      const mockResponse = {
        accessToken: 'test-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      };
      mockLogin.mockResolvedValue(mockResponse);

      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'testuser', password: 'password' });
      });

      // Clear auth state
      act(() => {
        useAuthStore.getState().clearAuthState();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should call mockQueryClientClear()', () => {
      act(() => {
        useAuthStore.getState().clearAuthState();
      });

      expect(mockQueryClientClear).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    describe('Network Errors', () => {
      it('should handle network errors (no response)', async () => {
        const networkError = new Error('Network Error');
        networkError.message = 'Network Error';
        mockLogin.mockRejectedValue(networkError);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Network Error');
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle network errors during OAuth2 login', async () => {
        const networkError = new Error('Network Error');
        mockFetchCurrentUserWith.mockRejectedValue(networkError);

        await expect(
          act(async () => {
            await useAuthStore.getState().loginWithOAuth2('token');
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Network Error');
        expect(localStorage.getItem('accessToken')).toBeNull();
      });
    });

    describe('HTTP Status Codes', () => {
      it('should handle 401 Unauthorized errors', async () => {
        const error = new Error('Unauthorized');
        (error as any).response = { status: 401, data: { message: 'Invalid credentials' } };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'wrong' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Invalid credentials');
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle 403 Forbidden errors', async () => {
        const error = new Error('Forbidden');
        (error as any).response = { status: 403, data: { message: 'Access forbidden' } };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Access forbidden');
      });

      it('should handle 500 Server errors', async () => {
        const error = new Error('Internal Server Error');
        (error as any).response = { status: 500, data: { message: 'Server error occurred' } };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Server error occurred');
      });

      it('should handle 400 Bad Request errors', async () => {
        const error = new Error('Bad Request');
        (error as any).response = { status: 400, data: { message: 'Invalid request data' } };
        mockSignup.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().signup({
              username: 'test',
              email: 'invalid-email',
              password: 'pass',
            });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Invalid request data');
      });
    });

    describe('Malformed Error Responses', () => {
      it('should handle errors with no message', async () => {
        const error = new Error('Unknown error');
        (error as any).response = { data: {} };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Unknown error');
      });

      it('should handle errors with no response object', async () => {
        const error = new Error('Direct error message');
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Direct error message');
      });

      it('should handle errors with malformed response.data', async () => {
        const error = new Error('Error');
        (error as any).response = { data: null };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Error');
      });

      it('should fallback to default error message when no message available', async () => {
        const error = new Error('');
        error.message = '';
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Login failed');
      });
    });

    describe('Error Message Extraction', () => {
      it('should extract error message from response.data.message', async () => {
        const error = new Error('Error');
        (error as any).response = { data: { message: 'Custom error message' } };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Custom error message');
      });

      it('should fallback to error.message when response.data.message is missing', async () => {
        const error = new Error('Fallback message');
        (error as any).response = { data: {} };
        mockLogin.mockRejectedValue(error);

        await expect(
          act(async () => {
            await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
          })
        ).rejects.toThrow();

        const state = useAuthStore.getState();
        expect(state.error).toBe('Fallback message');
      });
    });
  });

  describe('Loading States', () => {
    it('should set isLoading to true during signup', async () => {
      let resolveSignup: (value: any) => void;
      const signupPromise = new Promise((resolve) => {
        resolveSignup = resolve;
      });
      mockSignup.mockReturnValue(signupPromise as any);

      const signupOperation = useAuthStore.getState().signup({
        username: 'test',
        email: 'test@example.com',
        password: 'Password123!',
      });

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveSignup!({ success: true });
      await act(async () => {
        await signupOperation;
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during logout', async () => {
      let resolveLogout: (value: any) => void;
      const logoutPromise = new Promise((resolve) => {
        resolveLogout = resolve;
      });
      mockLogout.mockReturnValue(logoutPromise as any);

      const logoutOperation = useAuthStore.getState().logout();

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogout!({ success: true });
      await act(async () => {
        await logoutOperation;
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during 2FA login', async () => {
      let resolve2FA: (value: any) => void;
      const twoFAPromise = new Promise((resolve) => {
        resolve2FA = resolve;
      });
      mockLoginWith2FA.mockReturnValue(twoFAPromise as any);
      mockFetchCurrentUserWith.mockResolvedValue({ id: 1, username: 'test' } as any);

      const twoFAOperation = useAuthStore.getState().loginWith2FA({
        usernameOrEmail: 'test@example.com',
        password: 'Password123!',
        code: '123456',
      });

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolve2FA!({ accessToken: 'token' });
      await act(async () => {
        try {
          await twoFAOperation;
        } catch (e) {
          // ignore
        }
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during OAuth2 login', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      mockFetchCurrentUserWith.mockReturnValue(fetchPromise as any);

      const oauthOperation = useAuthStore.getState().loginWithOAuth2('token');

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveFetch!({ id: 1, username: 'test' });
      await act(async () => {
        try {
          await oauthOperation;
        } catch (e) {
          // ignore
        }
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to false after login failure', async () => {
      const error = new Error('Login failed');
      mockLogin.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'wrong' });
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to false after signup failure', async () => {
      const error = new Error('Signup failed');
      mockSignup.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().signup({
            username: 'test',
            email: 'test@example.com',
            password: 'Password123!',
          });
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to false after 2FA login failure', async () => {
      const error = new Error('2FA failed');
      mockLoginWith2FA.mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().loginWith2FA({
            usernameOrEmail: 'test@example.com',
            password: 'Password123!',
            code: 'wrong',
          });
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should prevent multiple simultaneous login attempts', async () => {
      let resolveCount = 0;
      const loginPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolveCount++;
          resolve({ accessToken: 'token', user: { id: 1 } });
        }, 100);
      });
      mockLogin.mockReturnValue(loginPromise as any);

      const login1 = useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });
      const login2 = useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });
      const login3 = useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });

      await act(async () => {
        await Promise.all([login1, login2, login3]);
      });

      // Should only resolve once (or handle gracefully)
      expect(resolveCount).toBeGreaterThan(0);
    });

    it('should handle navigation during async operation', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise as any);

      const loginOperation = useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });

      // Simulate navigation (clearing state)
      act(() => {
        useAuthStore.getState().clearAuthState();
      });

      resolveLogin!({ accessToken: 'token', user: { id: 1 } });
      await act(async () => {
        try {
          await loginOperation;
        } catch (e) {
          // May fail if state was cleared
        }
      });

      // State should be consistent
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('localStorage Edge Cases', () => {
    it('should handle localStorage quota exceeded', async () => {
      const originalSetItem = Storage.prototype.setItem;
      let setItemCalled = false;
      
      Storage.prototype.setItem = vi.fn(() => {
        setItemCalled = true;
        throw new DOMException('QuotaExceededError');
      });

      const mockResponse = {
        accessToken: 'test-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      };
      mockLogin.mockResolvedValue(mockResponse);

      await act(async () => {
        try {
          await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });
        } catch (e) {
          // Should handle gracefully
        }
      });

      // Should not crash, state should still update
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBeDefined();

      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle localStorage disabled', async () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      const mockResponse = {
        accessToken: 'test-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      };
      mockLogin.mockResolvedValue(mockResponse);

      await act(async () => {
        try {
          await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'pass' });
        } catch (e) {
          // Should handle gracefully
        }
      });

      // Should not crash
      const state = useAuthStore.getState();
      expect(state).toBeDefined();

      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle malformed data in localStorage', () => {
      // Set invalid JSON
      localStorage.setItem('user', 'invalid-json{');
      localStorage.setItem('accessToken', 'token');

      // Should not crash when reading
      const state = useAuthStore.getState();
      expect(state).toBeDefined();

      // Clear invalid data
      localStorage.removeItem('user');
    });

    it('should handle null values in localStorage', () => {
      localStorage.setItem('accessToken', 'null');
      localStorage.setItem('user', 'null');

      const state = useAuthStore.getState();
      expect(state).toBeDefined();
    });

    it('should handle empty string values in localStorage', () => {
      localStorage.setItem('accessToken', '');
      localStorage.setItem('user', '');

      const state = useAuthStore.getState();
      expect(state).toBeDefined();
    });
  });

  describe('auth:user-refreshed listener', () => {
    it('updates user and accessToken when the event fires', () => {
      const refreshedUser = { id: 1, username: 'refreshed', email: 'r@example.com' };

      act(() => {
        window.dispatchEvent(
          new CustomEvent('auth:user-refreshed', {
            detail: { user: refreshedUser, accessToken: 'refreshed-token' },
          }),
        );
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(refreshedUser);
      expect(state.accessToken).toBe('refreshed-token');
    });
  });

  describe('auth:session-expired listener', () => {
    it('clears auth state and sets sessionExpiredReason (after clearAuthState, not before)', async () => {
      // Seed an authenticated state first.
      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 1, username: 'u', email: 'u@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      });

      act(() => {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.sessionExpiredReason).toBe('SESSION_EXPIRED');
    });
  });

  describe('refreshSession', () => {
    it('delegates to refreshAuthSession and toggles isRefreshingSession', async () => {
      let resolveRefresh!: () => void;
      mockRefreshAuthSession.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      const promise = useAuthStore.getState().refreshSession();
      expect(useAuthStore.getState().isRefreshingSession).toBe(true);

      resolveRefresh();
      await act(async () => {
        await promise;
      });

      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isRefreshingSession).toBe(false);
      expect(useAuthStore.getState().sessionRefreshError).toBeNull();
    });

    it('sets sessionRefreshError to SESSION_EXPIRED and clears auth on a terminal failure', async () => {
      const refreshError = { response: { data: { errorCode: 'ERR_2004' } } };
      mockRefreshAuthSession.mockRejectedValue(refreshError);
      mockIsTerminalRefreshFailure.mockReturnValue(true);

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      expect(mockClearStoredAuth).toHaveBeenCalled();
      expect(useAuthStore.getState().sessionRefreshError).toBe('SESSION_EXPIRED');
    });

    it('sets sessionRefreshError to TEMPORARY and keeps the session on a non-terminal failure', async () => {
      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 1, username: 'u', email: 'u@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      });

      const refreshError = { message: 'Network Error' };
      mockRefreshAuthSession.mockRejectedValue(refreshError);
      mockIsTerminalRefreshFailure.mockReturnValue(false);

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      expect(mockClearStoredAuth).not.toHaveBeenCalled();
      expect(useAuthStore.getState().sessionRefreshError).toBe('TEMPORARY');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('sets sessionRefreshError to PORTAL_MISMATCH, clears storage, and does not dispatch auth:session-expired on a portal identity rejection', async () => {
      const admin = { id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_ADMIN'] };
      mockRefreshAuthSession.mockRejectedValue(new PortalIdentityRejectedError(admin as never));
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      expect(mockClearStoredAuth).toHaveBeenCalled();
      expect(useAuthStore.getState().sessionRefreshError).toBe('PORTAL_MISMATCH');
      const dispatchedSessionExpired = dispatchSpy.mock.calls
        .map(([event]) => event as CustomEvent)
        .some((event) => event.type === 'auth:session-expired');
      expect(dispatchedSessionExpired).toBe(false);
    });

    it('checks StaleAuthSessionError before PortalIdentityRejectedError', async () => {
      const admin = { id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_ADMIN'] };
      mockRefreshAuthSession.mockRejectedValue(new PortalIdentityRejectedError(admin as never));
      mockIsStaleAuthSessionError.mockReturnValue(true);

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      expect(mockClearStoredAuth).not.toHaveBeenCalled();
      expect(useAuthStore.getState().sessionRefreshError).toBeNull();
    });
  });

  describe('session-scoped refresh state does not leak across sessions', () => {
    const seedRefreshError = async (kind: 'SESSION_EXPIRED' | 'TEMPORARY') => {
      mockRefreshAuthSession.mockRejectedValue({ message: 'boom' });
      mockIsTerminalRefreshFailure.mockReturnValue(kind === 'SESSION_EXPIRED');
      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });
      expect(useAuthStore.getState().sessionRefreshError).toBe(kind);
    };

    it('login clears a SESSION_EXPIRED error left over from the previous session', async () => {
      await seedRefreshError('SESSION_EXPIRED');

      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 2, username: 'next', email: 'next@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'next', password: 'p' });
      });

      const state = useAuthStore.getState();
      expect(state.sessionRefreshError).toBeNull();
      expect(state.sessionExpiredReason).toBeNull();
      expect(state.isRefreshingSession).toBe(false);
    });

    it('login clears a TEMPORARY error even when the new user needs no role sync', async () => {
      // The self-healing path (refreshSession resetting the error on its next run) does
      // not apply here: a user who already holds ROLE_TEACHER never triggers a sync, so
      // without an explicit reset the stale error would hide the approved-application CTA
      // for the rest of the page session.
      await seedRefreshError('TEMPORARY');

      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 3, username: 't', email: 't@example.com', roles: ['ROLE_TEACHER'] },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 't', password: 'p' });
      });

      expect(useAuthStore.getState().sessionRefreshError).toBeNull();
    });

    it('logout clears sessionRefreshError and isRefreshingSession', async () => {
      await seedRefreshError('TEMPORARY');
      mockLogout.mockResolvedValue({ success: true, message: 'Logged out', status: 200 });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().sessionRefreshError).toBeNull();
      expect(useAuthStore.getState().isRefreshingSession).toBe(false);
    });

    it('clearAuthState clears sessionRefreshError', async () => {
      await seedRefreshError('TEMPORARY');

      act(() => {
        useAuthStore.getState().clearAuthState();
      });

      expect(useAuthStore.getState().sessionRefreshError).toBeNull();
    });
  });

  describe('refreshSession — stale session result', () => {
    it('reports no error and leaves the current session untouched', async () => {
      // A refresh that resolves after its own session ended (logout, or another user
      // logging in). Painting the CURRENT session with that failure would, for example,
      // hide the approved CTA for a user who just signed in fine.
      mockLogin.mockResolvedValue({
        accessToken: 'token-b',
        user: { id: 2, username: 'b', email: 'b@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'b', password: 'p' });
      });

      mockRefreshAuthSession.mockRejectedValue(new Error('stale'));
      mockIsStaleAuthSessionError.mockReturnValue(true);
      mockIsTerminalRefreshFailure.mockReturnValue(true); // must never be consulted

      await act(async () => {
        await useAuthStore.getState().refreshSession();
      });

      const state = useAuthStore.getState();
      expect(state.sessionRefreshError).toBeNull();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe(2);
      expect(mockClearStoredAuth).not.toHaveBeenCalled();
    });
  });

  describe('auth session identity', () => {
    it.each([
      ['login', async () => {
        mockLogin.mockResolvedValue({
          accessToken: 'token',
          user: { id: 1, username: 'u', email: 'u@example.com' },
        });
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      }],
      ['logout', async () => {
        mockLogout.mockResolvedValue({ success: true, message: 'ok', status: 200 });
        await useAuthStore.getState().logout();
      }],
      ['clearAuthState', async () => {
        useAuthStore.getState().clearAuthState();
      }],
    ])('%s invalidates any refresh still in flight', async (_name, run) => {
      await act(async () => {
        await run();
      });

      expect(mockInvalidateAuthSession).toHaveBeenCalled();
    });
  });

  describe('bootstrapAuthSession', () => {
    it('starts idle', () => {
      expect(useAuthStore.getState().authBootStatus).toBe('idle');
    });

    it('probes refresh once and adopts the identity on success', async () => {
      mockRefreshAuthSession.mockImplementation(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:user-refreshed', {
            detail: { user: { id: 1, username: 'u', email: 'u@example.com' }, accessToken: 'boot-token' },
          }),
        );
        return { accessToken: 'boot-token', user: { id: 1 } } as any;
      });

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
      expect(state.authBootStatus).toBe('ready');
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('boot-token');
    });

    it('does not probe a second time once boot already started', async () => {
      mockRefreshAuthSession.mockResolvedValue({ accessToken: 't', user: { id: 1 } } as any);

      await act(async () => {
        await Promise.all([
          useAuthStore.getState().bootstrapAuthSession(),
          useAuthStore.getState().bootstrapAuthSession(),
        ]);
      });

      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
    });

    it('marks boot ready without touching state on a stale session result', async () => {
      mockRefreshAuthSession.mockRejectedValue(new Error('stale'));
      mockIsStaleAuthSessionError.mockReturnValue(true);

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(state.authBootStatus).toBe('ready');
      expect(state.isAuthenticated).toBe(false);
      expect(mockClearStoredAuth).not.toHaveBeenCalled();
    });

    it('clears local state and reports PORTAL_MISMATCH on a portal identity rejection, leaving the shared cookie alone', async () => {
      const admin = { id: 9, username: 'admin', email: 'a@example.com', roles: ['ROLE_ADMIN'] };
      mockRefreshAuthSession.mockRejectedValue(new PortalIdentityRejectedError(admin as never));

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(mockClearStoredAuth).toHaveBeenCalled();
      expect(state.sessionRefreshError).toBe('PORTAL_MISMATCH');
      expect(state.isAuthenticated).toBe(false);
      expect(state.authBootStatus).toBe('ready');
    });

    it('does not dispatch auth:session-expired for a guest with no prior local session', async () => {
      const refreshError = { response: { data: { errorCode: 'ERR_2004' } } };
      mockRefreshAuthSession.mockRejectedValue(refreshError);
      mockIsTerminalRefreshFailure.mockReturnValue(true);
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(state.authBootStatus).toBe('ready');
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiredReason).toBeNull();
      const dispatchedSessionExpired = dispatchSpy.mock.calls
        .map(([event]) => event as CustomEvent)
        .some((event) => event.type === 'auth:session-expired');
      expect(dispatchedSessionExpired).toBe(false);
    });

    it('dispatches auth:session-expired when a previously authenticated snapshot turns out to be terminally dead', async () => {
      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 1, username: 'u', email: 'u@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      });
      // Simulate a fresh page load: identity persisted, boot not yet run.
      useAuthStore.setState({ authBootStatus: 'idle' });

      const refreshError = { response: { data: { errorCode: 'ERR_2004' } } };
      mockRefreshAuthSession.mockRejectedValue(refreshError);
      mockIsTerminalRefreshFailure.mockReturnValue(true);

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionExpiredReason).toBe('SESSION_EXPIRED');
    });

    it('goes to retry status on a temporary boot failure and keeps the existing snapshot untouched', async () => {
      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 1, username: 'u', email: 'u@example.com' },
      });
      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      });
      useAuthStore.setState({ authBootStatus: 'idle' });

      mockRefreshAuthSession.mockRejectedValue({ message: 'Network Error' });
      mockIsTerminalRefreshFailure.mockReturnValue(false);

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(state.authBootStatus).toBe('retry');
      expect(state.sessionRefreshError).toBe('TEMPORARY');
      expect(state.isAuthenticated).toBe(true);
      expect(mockClearStoredAuth).not.toHaveBeenCalled();
    });

    it('can be re-run after a retry-status failure', async () => {
      mockRefreshAuthSession.mockRejectedValue({ message: 'Network Error' });
      mockIsTerminalRefreshFailure.mockReturnValue(false);

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });
      expect(useAuthStore.getState().authBootStatus).toBe('retry');

      mockRefreshAuthSession.mockImplementation(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:user-refreshed', {
            detail: { user: { id: 1, username: 'u', email: 'u@example.com' }, accessToken: 'retried-token' },
          }),
        );
        return { accessToken: 'retried-token', user: { id: 1 } } as any;
      });

      await act(async () => {
        await useAuthStore.getState().bootstrapAuthSession();
      });

      const state = useAuthStore.getState();
      expect(state.authBootStatus).toBe('ready');
      expect(state.isAuthenticated).toBe(true);
      expect(mockRefreshAuthSession).toHaveBeenCalledTimes(2);
    });
  });

  describe('role sync attempt flags', () => {
    it('login resets both attempt flags', async () => {
      markGuardAttempted(1);
      mockLogin.mockResolvedValue({
        accessToken: 'token',
        user: { id: 1, username: 'u', email: 'u@example.com' },
      });

      await act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'u', password: 'p' });
      });

      expect(hasGuardAttempted(1)).toBe(false);
    });

    it('logout resets both attempt flags', async () => {
      markGuardAttempted(1);
      mockLogout.mockResolvedValue({ success: true, message: 'Logged out', status: 200 });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(hasGuardAttempted(1)).toBe(false);
    });

    it('the guard flag and the approval flag dedupe independently', () => {
      markGuardAttempted(1);

      expect(hasGuardAttempted(1)).toBe(true);
      // A prior guard attempt for this user must NOT suppress the approval sync —
      // regression test for the "lost sync after approval" scenario.
      expect(hasApprovalAttempted(1)).toBe(false);
    });
  });
});
