import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

import { useAuthStore } from '@user/stores/auth.store';

// Mock the auth store
const mockLogin = vi.fn();
const mockLoginWith2FA = vi.fn();
const mockClearError = vi.fn();

vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    loginWith2FA: mockLoginWith2FA,
    clearError: mockClearError,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  }),
}));

// Mock the auth service
vi.mock('@user/services/index', () => ({
  authService: {
    getGoogleOAuthUrl: () => 'https://accounts.google.com/oauth2/auth',
    getFacebookOAuthUrl: () => 'https://www.facebook.com/v12.0/dialog/oauth',
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { message: 'Verification successful!' } }),
  };
});

// Mock shared-utils
vi.mock('@edumind/shared-utils', () => ({
  USER_ROUTES: {
    DASHBOARD: '/dashboard',
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    TWO_FA_RECOVERY: '/2fa-recovery',
    RESEND_VERIFICATION: '/resend-verification',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading, disabled, ...props }: any) => (
    <button 
      type={type || 'button'} 
      onClick={onClick} 
      disabled={isLoading || disabled}
      data-testid={props['data-testid']}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, error, ...props }: any) => (
    <div>
      {label && <label htmlFor={props.name}>{label}</label>}
      <input {...props} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  PasswordInput: ({ error, ...props }: any) => (
    <div>
      <input type="password" {...props} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  Alert: ({ message, variant }: any) => (
    <div role="alert" data-variant={variant}>{message}</div>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  User: () => <span data-testid="user-icon">User</span>,
}));

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the login form', () => {
      renderLoginPage();

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your EduMind account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. lucas or lucas@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      // Mock loading state
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        loginWith2FA: mockLoginWith2FA,
        clearError: mockClearError,
        isLoading: true,
        error: null,
        isAuthenticated: false,
      } as any);

      renderLoginPage();
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    });

    it('should render OAuth2 buttons', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should render links to signup and forgot password', () => {
      renderLoginPage();

      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot/i })).toBeInTheDocument();
    });

    it('should render resend verification link', () => {
      renderLoginPage();

      expect(screen.getByRole('link', { name: /resend verification email/i })).toBeInTheDocument();
    });
      expect(screen.getByRole('link', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('should show success toast if location state has message', () => {
      renderLoginPage();
      expect(vi.mocked(useToast().success)).toHaveBeenCalledWith('Verification successful!');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when submitting empty form', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for validation errors
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should allow submission when fields are non-empty', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'a');
      await user.type(passwordInput, 'pass');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          usernameOrEmail: 'a',
          password: 'pass',
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login with form data on submit', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'testuser@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          usernameOrEmail: 'testuser@example.com',
          password: 'Password123!',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        expect(vi.mocked(useToast().success)).toHaveBeenCalledWith('Login successful!');
      });
    });

    it('should show error toast on login failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Invalid credentials');
      mockLogin.mockRejectedValue(error);
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'wrong');
      await user.type(screen.getByPlaceholderText('••••••••'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(vi.mocked(useToast().error)).toHaveBeenCalledWith('Login failed. Please check your credentials.');
      });
    });

    it('should show 2FA form when 2FA is required', async () => {
      const user = userEvent.setup();
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'testuser@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });
    });
  });

  describe('2FA Form', () => {
    it('should submit 2FA code correctly', async () => {
      const user = userEvent.setup();
      
      // First trigger 2FA requirement
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      mockLoginWith2FA.mockResolvedValue(undefined);
      
      renderLoginPage();

      // Submit login form
      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      await user.type(emailInput, 'testuser@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for 2FA form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Submit 2FA code
      const codeInput = screen.getByPlaceholderText('000000');
      await user.type(codeInput, '123456');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(mockLoginWith2FA).toHaveBeenCalledWith({
          usernameOrEmail: 'testuser@example.com',
          password: 'Password123!',
          code: '123456',
        });
      });
    });

    it('should allow going back from 2FA form', async () => {
      const user = userEvent.setup();
      
      // Trigger 2FA requirement
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      
      renderLoginPage();

      // Submit login form to trigger 2FA
      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for 2FA form
      await waitFor(() => {
        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      });

      // Click back button
      await user.click(screen.getByRole('button', { name: /back to login/i }));

      // Should show login form again
      await waitFor(() => {
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      });
    });
  });

  describe('OAuth2 Login', () => {
    it('should redirect to Google OAuth on button click', async () => {
      const user = userEvent.setup();
      const originalLocation = window.location;
      
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true,
      });

      renderLoginPage();

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      expect(window.location.href).toBe('https://accounts.google.com/oauth2/auth');

      // Restore
      Object.defineProperty(window, 'location', { value: originalLocation });
    });

    it('should redirect to Facebook OAuth on button click', async () => {
      const user = userEvent.setup();
      const originalLocation = window.location;
      
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true,
      });

      renderLoginPage();

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i });
      await user.click(facebookButton);

      expect(window.location.href).toBe('https://www.facebook.com/v12.0/dialog/oauth');

      Object.defineProperty(window, 'location', { value: originalLocation });
    });
  });
});
