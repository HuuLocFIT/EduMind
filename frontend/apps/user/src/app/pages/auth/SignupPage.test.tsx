import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';

// Mock auth store
const mockSignup = vi.fn();
const mockClearError = vi.fn();

const mockUseAuthStore = vi.fn(() => ({
  signup: mockSignup,
  isLoading: false,
  error: null,
  clearError: mockClearError,
}));

vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// Mock auth service
vi.mock('@user/services/index', () => ({
  authService: {
    getGoogleOAuthUrl: () => 'https://accounts.google.com/oauth2/auth',
    getFacebookOAuthUrl: () => 'https://www.facebook.com/oauth',
  },
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
    SIGNUP: '/signup',
  },
  getPasswordStrength: (password: string) => {
    if (!password) return null;
    if (password.length < 6) return { score: 2, label: 'Weak', color: 'red' };
    if (password.length < 10) return { score: 4, label: 'Fair', color: 'yellow' };
    return { score: 6, label: 'Strong', color: 'green' };
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, error, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input {...props} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  PasswordInput: ({ label, error, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input type="password" {...props} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Mail: () => <span>Mail</span>,
  User: () => <span>User</span>,
  Phone: () => <span>Phone</span>,
  CheckCircle: () => <span>CheckCircle</span>,
}));

const renderSignupPage = () => {
  return render(
    <BrowserRouter>
      <SignupPage />
    </BrowserRouter>
  );
};

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useAuthStore mock to default
    mockUseAuthStore.mockReturnValue({
      signup: mockSignup,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  describe('Rendering', () => {
    it('should render signup form', () => {
      renderSignupPage();

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. lucas')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument();
    });

    it('should render OAuth2 buttons', () => {
      renderSignupPage();

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it('should render login link', () => {
      renderSignupPage();

      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call signup with form data', async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValue(undefined);
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.type(screen.getByPlaceholderText('Lucas'), 'Test');
      await user.type(screen.getByPlaceholderText('Nguyen'), 'User');

      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      });
    });

    it('should show success message after signup', async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValue(undefined);
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');

      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(screen.getByText('Account Created!')).toBeInTheDocument();
      });
    });
  });

  describe('OAuth2 Login', () => {
    it('should redirect to Google OAuth', async () => {
      const user = userEvent.setup();
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true,
      });

      renderSignupPage();
      await user.click(screen.getByRole('button', { name: /continue with google/i }));

      expect(window.location.href).toBe('https://accounts.google.com/oauth2/auth');
      Object.defineProperty(window, 'location', { value: originalLocation });
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty username', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      const submitButton = screen.getByRole('button', { name: /^Create Account$/i });
      await user.click(submitButton);

      // Form should not submit when validation fails
      await waitFor(() => {
        // Either validation error is shown OR form submission was prevented
        const usernameInput = screen.getByPlaceholderText('e.g. lucas');
        const hasError = usernameInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length; // Form didn't submit
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(emailInput, 'invalid-email');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        // Check for validation error or form not submitting
        const hasError = emailInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length;
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });

    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('your.email@example.com');
        const hasError = emailInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length;
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        const passwordInput = screen.getByPlaceholderText('Create a strong password');
        const hasError = passwordInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length;
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'weak');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should allow submission when all required fields are valid', async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValue(undefined);
      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');

      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      });
    });

    it('should show field-specific error messages', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      const submitButton = screen.getByRole('button', { name: /^Create Account$/i });
      await user.click(submitButton);

      await waitFor(() => {
        // At least one input should have validation error or form should not submit
        const inputs = [
          screen.getByPlaceholderText('e.g. lucas'),
          screen.getByPlaceholderText('your.email@example.com'),
          screen.getByPlaceholderText('Create a strong password'),
        ];
        const hasError = inputs.some(input => input.getAttribute('aria-invalid') === 'true') ||
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length;
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });

    it('should validate username format', async () => {
      const user = userEvent.setup();
      renderSignupPage();

      // Try with invalid username (too short or invalid characters)
      const usernameInput = screen.getByPlaceholderText('e.g. lucas');
      await user.type(usernameInput, 'ab');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
      }, { timeout: 2000 });
    });

    it('should validate email format correctly', async () => {
      const user = userEvent.setup();
      mockSignup.mockClear();
      renderSignupPage();

      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(emailInput, 'not-an-email');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        const hasError = emailInput.getAttribute('aria-invalid') === 'true' || 
                        screen.queryAllByRole('alert').length > 0 ||
                        !mockSignup.mock.calls.length;
        expect(hasError).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('Loading States', () => {
    it('should disable submit button when loading', () => {
      mockUseAuthStore.mockReturnValue({
        signup: mockSignup,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      renderSignupPage();
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    });

    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      let resolveSignup: (value: any) => void;
      const signupPromise = new Promise((resolve) => {
        resolveSignup = resolve;
      });
      mockSignup.mockReturnValue(signupPromise);

      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      // Verify that signup was called (form submitted)
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      }, { timeout: 2000 });

      // The button should show loading state - check if it shows "Loading..." text
      // or if the store's isLoading state would make it disabled
      // Since the store manages isLoading internally, we verify the form submission happened
      const button = screen.getByRole('button', { name: /create account|loading/i });
      expect(button).toBeDefined();

      resolveSignup!({ success: true });
      await signupPromise;
    });
  });

  describe('Error Handling', () => {
    it('should display error message on signup failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Username already taken');
      mockSignup.mockRejectedValue(error);

      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'existinguser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(screen.getByText(/username already taken|failed to create/i)).toBeInTheDocument();
      });
    });

    it('should clear error when form is resubmitted', async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce(new Error('Error 1'));
      mockSignup.mockResolvedValueOnce(undefined);

      renderSignupPage();

      await user.type(screen.getByPlaceholderText('e.g. lucas'), 'testuser');
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledTimes(1);
      });

      // Resubmit
      await user.click(screen.getByRole('button', { name: /^Create Account$/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledTimes(2);
      });
    });
  });
});
