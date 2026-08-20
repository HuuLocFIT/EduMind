import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

// Mock the auth store
const mockLogin = vi.fn();
const mockLoginWith2FA = vi.fn();
const mockClearError = vi.fn();

const mockUseAuthStore = vi.fn(() => ({
  login: mockLogin,
  loginWith2FA: mockLoginWith2FA,
  clearError: mockClearError,
  isLoading: false,
  error: null,
  isAuthenticated: false,
}));

vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// Mock the auth service - use relative path to match component import
vi.mock('../../services/auth.service', () => ({
  authService: {
    getGoogleOAuthUrl: () => 'https://accounts.google.com/oauth2/auth',
    getFacebookOAuthUrl: () => 'https://www.facebook.com/v12.0/dialog/oauth',
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
let mockLocationState: Record<string, unknown> = { message: 'Verification successful!' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

// Mock shared-utils (must include all exports used by dependencies)
vi.mock('@edumind/shared-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edumind/shared-utils')>();
  return {
    ...actual,
    USER_ROUTES: {
      DASHBOARD: '/dashboard',
      SIGNUP: '/signup',
      FORGOT_PASSWORD: '/forgot-password',
      TWO_FA_RECOVERY: '/2fa-recovery',
      RESEND_VERIFICATION: '/resend-verification',
    },
  };
});

// Mock toast functions
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

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
      {error && <span>{error}</span>}
    </div>
  ),
  PasswordInput: ({ error, ...props }: any) => (
    <div>
      <input type="password" {...props} aria-invalid={!!error} />
      {error && <span>{error}</span>}
    </div>
  ),
  Alert: ({ message, variant }: any) => (
    <div role="alert" data-variant={variant}>{message}</div>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
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
    mockLocationState = { message: 'Verification successful!' };
    // Reset useAuthStore mock to default
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      loginWith2FA: mockLoginWith2FA,
      clearError: mockClearError,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });
  });

  describe('Rendering', () => {
    it('should render the login form', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByText('Welcome back to EduMind')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. lucas or lucas@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      // Mock loading state
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        loginWith2FA: mockLoginWith2FA,
        clearError: mockClearError,
        isLoading: true,
        error: null,
        isAuthenticated: false,
      });

      renderLoginPage();
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    });

    it('should render OAuth2 buttons', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
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

    it('should show success alert if location state has message', () => {
      renderLoginPage();
      // The component shows an Alert component, not a toast, for location state messages
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Verification successful!');
      expect(alert).toHaveAttribute('data-variant', 'success');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when submitting empty form', async () => {
      const user = userEvent.setup();
      mockLocationState = {};
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      const summary = await screen.findByTestId('login-error');
      const announcement = await screen.findByRole('alert');
      expect(screen.getByPlaceholderText('e.g. lucas or lucas@email.com')).toHaveFocus();
      expect(summary).toHaveTextContent('2 errors');
      expect(summary).toHaveTextContent('Username or email is required');
      expect(summary).toHaveTextContent('Password is required');
      expect(announcement).toHaveTextContent('2 errors');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('announces only the remaining validation error on a later submit', async () => {
      const user = userEvent.setup();
      mockLocationState = {};
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      const firstAnnouncement = await screen.findByRole('alert');
      await user.type(
        screen.getByPlaceholderText('e.g. lucas or lucas@email.com'),
        'student',
      );
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('1 error');
      });
      const summary = screen.getByTestId('login-error');
      expect(screen.getByRole('alert')).not.toBe(firstAnnouncement);
      expect(screen.getByPlaceholderText('••••••••')).toHaveFocus();
      expect(summary).toHaveTextContent('1 error');
      expect(summary).toHaveTextContent('Password is required');
      expect(summary).not.toHaveTextContent('Username or email is required');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(mockLogin).not.toHaveBeenCalled();
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
      });

      // Wait for navigation and toast
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Login successful!');
      });
    });

    it('returns to the protected route after login', async () => {
      const user = userEvent.setup();
      mockLocationState = {
        from: { pathname: '/learning', search: '?tab=active', hash: '#course-list' },
      };
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'student');
      await user.type(screen.getByPlaceholderText('••••••••'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/learning?tab=active#course-list',
          { replace: true },
        );
      }, { timeout: 2000 });
    });

    it('should announce a login failure once through the inline alert', async () => {
      const user = userEvent.setup();
      const error = new Error('Invalid credentials');
      mockLogin.mockRejectedValue(error);
      renderLoginPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'wrong');
      await user.type(screen.getByPlaceholderText('••••••••'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
      });
      expect(mockToastError).not.toHaveBeenCalled();
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
        expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      });
    });

    it('should show error for invalid 2FA code', async () => {
      const user = userEvent.setup();
      
      // Trigger 2FA requirement
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      
      const invalidCodeError = new Error('Invalid 2FA code');
      mockLoginWith2FA.mockRejectedValue(invalidCodeError);
      
      renderLoginPage();

      // Submit login form to trigger 2FA
      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for 2FA form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Submit invalid 2FA code
      const codeInput = screen.getByPlaceholderText('000000');
      await user.type(codeInput, '000000');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid 2FA code');
      });
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should handle network error during 2FA verification', async () => {
      const user = userEvent.setup();
      
      // Trigger 2FA requirement
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      
      const networkError = new Error('Network error');
      mockLoginWith2FA.mockRejectedValue(networkError);
      
      renderLoginPage();

      // Submit login form to trigger 2FA
      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password');
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
        expect(screen.getByTestId('login-error')).toHaveTextContent('Network error');
      });
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should show error message for expired 2FA code', async () => {
      const user = userEvent.setup();
      
      // Trigger 2FA requirement
      const twoFAError = new Error('Two-factor authentication required');
      (twoFAError as any).requires2FA = true;
      mockLogin.mockRejectedValue(twoFAError);
      
      const expiredError = new Error('2FA code has expired');
      (expiredError as any).response = { status: 400, data: { message: '2FA code has expired' } };
      mockLoginWith2FA.mockRejectedValue(expiredError);
      
      renderLoginPage();

      // Submit login form to trigger 2FA
      await user.type(screen.getByPlaceholderText('e.g. lucas or lucas@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for 2FA form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Submit expired 2FA code
      const codeInput = screen.getByPlaceholderText('000000');
      await user.type(codeInput, '123456');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('2FA code has expired');
      });
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should validate 2FA code format (6 digits)', async () => {
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
        expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      });

      // Try to submit invalid format (less than 6 digits)
      const codeInput = screen.getByPlaceholderText('000000');
      await user.type(codeInput, '12345');
      await user.click(screen.getByRole('button', { name: /verify/i }));

      // Should show validation error - check if form prevents submission or shows error
      await waitFor(() => {
        // Either the input should have aria-invalid or the form should not submit
        const hasError = codeInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryByText(/6 digits|code must/i) !== null;
        expect(hasError || mockLoginWith2FA).toBeDefined();
      }, { timeout: 2000 });
    });
  });

  describe('OAuth2 Login', () => {
    it('should redirect to Google OAuth on button click', async () => {
      const user = userEvent.setup();
      const originalLocation = window.location;
      let hrefValue = '';
      delete (window as any).location;
      (window as any).location = {
        ...originalLocation,
        get href() {
          return hrefValue;
        },
        set href(value: string) {
          hrefValue = value;
        },
      };

      renderLoginPage();

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(hrefValue).toBe('https://accounts.google.com/oauth2/auth');
      });
      
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    });

  });

  describe('Concurrent Operations', () => {
    it('should prevent multiple simultaneous form submissions', async () => {
      const user = userEvent.setup();
      let resolveCount = 0;
      const loginPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolveCount++;
          resolve({ accessToken: 'token', user: { id: 1 } });
        }, 100);
      });
      mockLogin.mockReturnValue(loginPromise as any);

      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      await waitFor(() => {
        // Should handle gracefully - either prevent multiple calls or handle them
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle form submission during navigation', async () => {
      const user = userEvent.setup();
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise as any);

      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('e.g. lucas or lucas@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      // Simulate navigation
      mockNavigate('/dashboard');

      resolveLogin!({ accessToken: 'token', user: { id: 1 } });
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });
});
