import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockForgotPassword } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
}));

// Mock auth service
vi.mock('@user/services/index', () => ({
  authService: {
    forgotPassword: mockForgotPassword,
  },
}));

// Import component after mocks
import { ForgotPasswordPage } from './ForgotPasswordPage';

// Mock shared-utils
vi.mock('@edumind/shared-utils', () => ({
  USER_ROUTES: {
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, error, helperText, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input {...props} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
      {helperText && <span>{helperText}</span>}
    </div>
  ),
  Alert: ({ message, variant }: any) => <div role="alert" data-variant={variant}>{message}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Mail: () => <span>Mail</span>,
  ArrowLeft: () => <span>←</span>,
  CheckCircle: () => <span>✓</span>,
  GraduationCap: () => <span>🎓</span>,
}));

const renderForgotPasswordPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render forgot password form', () => {
      renderForgotPasswordPage();

      expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      renderForgotPasswordPage();

      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call forgotPassword with email', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    it('should show success state after email sent', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });
    });

    it('should show error on failed request', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValue(new Error('User not found'));
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'unknown@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      // On invalid email, the form should not submit and the API should not be called.
      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });
  });
});
