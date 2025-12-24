import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from './auth.store';

// Mock the auth service
vi.mock('@user/services/index', () => ({
  authService: {
    login: vi.fn(),
    loginWith2FA: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    fetchCurrentUser: vi.fn(),
  },
}));

// Mock the query client
vi.mock('../lib/query-client', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

// Import the mocked service
import { authService } from '@user/services/index';
// Import the query client
import { queryClient } from '../lib/query-client';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store state
    const { clearAuthState } = useAuthStore.getState();
    clearAuthState();
    
    // Clear all mocks
    vi.clearAllMocks();
    localStorage.clear();
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
      vi.mocked(authService.login).mockResolvedValue(mockResponse);

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
      vi.mocked(authService.login).mockResolvedValue(mockResponse);

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
      vi.mocked(authService.login).mockRejectedValue(error);

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
      vi.mocked(authService.login).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)) as any);
      
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
      vi.mocked(authService.fetchCurrentUser).mockResolvedValue(mockUser);

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
      vi.mocked(authService.fetchCurrentUser).mockRejectedValue(error);

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
  });

  describe('loginWith2FA', () => {
    it('should complete 2FA login successfully', async () => {
      const mockJwtResponse = {
        accessToken: '2fa-token',
      };
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      
      vi.mocked(authService.loginWith2FA).mockResolvedValue(mockJwtResponse);
      vi.mocked(authService.fetchCurrentUser).mockResolvedValue(mockUser);

      await act(async () => {
        await useAuthStore.getState().loginWith2FA({ 
          usernameOrEmail: 'test@example.com', 
          code: '123456' 
        });
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('2fa-token');
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('signup', () => {
    it('should complete signup successfully', async () => {
      vi.mocked(authService.signup).mockResolvedValue({ 
        success: true, 
        message: 'Registration successful',
        status: 201
      });

      await act(async () => {
        await useAuthStore.getState().signup({
          username: 'newuser',
          email: 'new@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
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
      vi.mocked(authService.signup).mockRejectedValue(error);

      await expect(
        act(async () => {
          await useAuthStore.getState().signup({
            username: 'existinguser',
            email: 'new@example.com',
            password: 'Password123!',
            firstName: 'New',
            lastName: 'User',
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
      vi.mocked(authService.login).mockResolvedValue(mockResponse);
      vi.mocked(authService.logout).mockResolvedValue({ success: true, message: 'Logged out', status: 200 });

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
      expect(queryClient.clear).toHaveBeenCalled();
    });

    it('should clear state even if logout API fails', async () => {
      // Setup authenticated state
      localStorage.setItem('accessToken', 'test-token');
      
      vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'));

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
      vi.mocked(authService.login).mockRejectedValue(error);

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
      vi.mocked(authService.login).mockResolvedValue(mockResponse);

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
  });
});
