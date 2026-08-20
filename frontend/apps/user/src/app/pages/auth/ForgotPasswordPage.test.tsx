import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockForgotPassword } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
}));

// Mock auth service - use relative path to match component import
vi.mock('../../services/auth.service', () => ({
  authService: {
    forgotPassword: mockForgotPassword,
  },
}));

// Import component after mocks
import { ForgotPasswordPage } from './ForgotPasswordPage';

// Mock shared-utils (must include all exports used by dependencies)
vi.mock('@edumind/shared-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edumind/shared-utils')>();
  return {
    ...actual,
    USER_ROUTES: {
      LOGIN: '/login',
      FORGOT_PASSWORD: '/forgot-password',
    },
  };
});

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, error, helperText, id, ...props }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...props} aria-invalid={!!error} />
      {error && <span>{error}</span>}
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
  HelpCircle: () => <span>?</span>,
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
      mockForgotPassword.mockResolvedValue({ success: true, message: 'Reset link sent' });
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
      }, { timeout: 3000 });
    });

    it('should show success state after email sent', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValue({ success: true, message: 'Reset link sent' });
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check Your Email' })).toHaveFocus();
      }, { timeout: 3000 });
    });

    it('uses an email label and appropriate autocomplete metadata', () => {
      renderForgotPasswordPage();

      const email = screen.getByRole('textbox', { name: /email address/i });
      expect(email).toHaveAttribute('autocomplete', 'email');
      expect(email).toBeRequired();
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

      const summary = await screen.findByRole('alert');
      expect(screen.getByPlaceholderText('your@email.com')).toHaveFocus();
      expect(summary).toHaveTextContent('1 error');
      expect(summary).toHaveTextContent('Invalid email address');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      renderForgotPasswordPage();

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error for email without @ symbol', async () => {
      const user = userEvent.setup();
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'notanemail');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });

    it('should show error for email without domain', async () => {
      const user = userEvent.setup();
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });

    it('should allow submission when email is valid', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'valid@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'valid@example.com' });
      });
    });
  });

  describe('Loading States', () => {
    it('should disable submit button when loading', async () => {
      const user = userEvent.setup();
      let resolveForgot: (value: any) => void;
      const forgotPromise = new Promise((resolve) => {
        resolveForgot = resolve;
      });
      mockForgotPassword.mockReturnValue(forgotPromise);

      renderForgotPasswordPage();

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /send reset link|loading/i });
        expect(button).toBeDisabled();
      });

      resolveForgot!({ success: true });
      await forgotPromise;
    });
  });

  describe('Success actions', () => {
    it('supports keyboard resend and announces completion', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();

      await user.type(screen.getByRole('textbox', { name: /email address/i }), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      await screen.findByRole('heading', { name: /check your email/i });

      const resend = screen.getByRole('button', { name: /resend email/i });
      resend.focus();
      await user.keyboard('{Enter}');

      const announcement = await screen.findByText('Reset email sent again.');
      expect(announcement).toHaveAttribute('role', 'status');
      expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
    });
  });
});
