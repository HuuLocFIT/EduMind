import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TwoFactorRecoveryPage } from './TwoFactorRecoveryPage';

// Mock auth store
const mockLoginWith2FA = vi.fn();
vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    loginWith2FA: mockLoginWith2FA,
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
    PROFILE_SETTINGS: '/settings',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>,
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <span>🛡️</span>,
  ArrowLeft: () => <span>←</span>,
  Key: () => <span>🔑</span>,
}));

const renderTwoFactorRecoveryPage = (loginData?: any) => {
  const initialEntries = loginData
    ? [{ pathname: '/2fa-recovery', state: { loginData } }]
    : ['/2fa-recovery'];

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TwoFactorRecoveryPage />
    </MemoryRouter>
  );
};

describe('TwoFactorRecoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Login Data', () => {
    it('should show login required message when no login data', () => {
      renderTwoFactorRecoveryPage();

      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
    });
  });

  describe('With Login Data', () => {
    const loginData = { usernameOrEmail: 'test@example.com', password: 'password' };

    it('should render recovery form', () => {
      renderTwoFactorRecoveryPage(loginData);

      expect(screen.getByText('Use Backup Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter backup code')).toBeInTheDocument();
    });

    it('should call loginWith2FA with backup code', async () => {
      const user = userEvent.setup();
      mockLoginWith2FA.mockResolvedValue(undefined);
      renderTwoFactorRecoveryPage(loginData);

      await user.type(screen.getByPlaceholderText('Enter backup code'), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /verify & login/i }));

      await waitFor(() => {
        expect(mockLoginWith2FA).toHaveBeenCalledWith({
          usernameOrEmail: 'test@example.com',
          password: 'password',
          code: 'ABC12345',
        });
      });
    });

    it('should navigate to dashboard on success', async () => {
      const user = userEvent.setup();
      mockLoginWith2FA.mockResolvedValue(undefined);
      renderTwoFactorRecoveryPage(loginData);

      await user.type(screen.getByPlaceholderText('Enter backup code'), 'ABC12345');
      await user.click(screen.getByRole('button', { name: /verify & login/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 2000 });
    });
  });
});
