import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OAuth2CallbackPage } from './OAuth2CallbackPage';

// Mock auth store
const mockLoginWithOAuth2 = vi.fn();
vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    loginWithOAuth2: mockLoginWithOAuth2,
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock shared-utils
vi.mock('@edumind/shared-utils', () => ({
  USER_ROUTES: {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  useToast: () => ({ 
    success: vi.fn(), 
    error: vi.fn() 
  }),
}));

const renderOAuth2CallbackPage = (queryString: string) => {
  return render(
    <MemoryRouter initialEntries={[`/oauth2/callback${queryString}`]}>
      <OAuth2CallbackPage />
    </MemoryRouter>
  );
};

describe('OAuth2CallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should show processing state', () => {
      mockLoginWithOAuth2.mockReturnValue(new Promise(() => {})); // Never resolves
      renderOAuth2CallbackPage('?token=valid-token');

      expect(screen.getByText('Completing authentication...')).toBeInTheDocument();
    });
  });

  describe('Success Flow', () => {
    it('should call loginWithOAuth2 with token', async () => {
      mockLoginWithOAuth2.mockResolvedValue(undefined);
      renderOAuth2CallbackPage('?token=valid-token');

      await waitFor(() => {
        expect(mockLoginWithOAuth2).toHaveBeenCalledWith('valid-token');
      });
    });

    it('should navigate to dashboard on success', async () => {
      mockLoginWithOAuth2.mockResolvedValue(undefined);
      renderOAuth2CallbackPage('?token=valid-token');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Error Handling', () => {
    it('should navigate to login when no token', async () => {
      renderOAuth2CallbackPage('');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should navigate to login on error param', async () => {
      renderOAuth2CallbackPage('?error=access_denied');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should navigate to login on auth failure', async () => {
      mockLoginWithOAuth2.mockRejectedValue(new Error('Auth failed'));
      renderOAuth2CallbackPage('?token=invalid-token');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });
});
