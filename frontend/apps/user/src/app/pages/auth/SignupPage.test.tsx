import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';

// Mock auth store
const mockSignup = vi.fn();
const mockClearError = vi.fn();

vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    signup: mockSignup,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
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

      await user.click(screen.getByRole('button', { name: /create account/i }));

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

      await user.click(screen.getByRole('button', { name: /create account/i }));

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
});
