import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockResetPassword, mockNavigate } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock auth service - use relative path to match component import
vi.mock('../../services/auth.service', () => ({
  authService: {
    resetPassword: mockResetPassword,
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import component after mocks
import { ResetPasswordPage } from './ResetPasswordPage';

// Mock shared-utils (must include all exports used by dependencies)
vi.mock('@edumind/shared-utils', async (importOriginal) => {
  const actual = await importOriginal();
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
  PasswordInput: ({ label, error, helperText, id, ...props }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} type="password" {...props} aria-invalid={!!error} />
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
  Lock: () => <span>🔒</span>,
  CheckCircle: () => <span>✓</span>,
  GraduationCap: () => <span>🎓</span>,
}));

const renderResetPasswordPage = (token?: string) => {
  const route = token ? `/reset-password?token=${token}` : '/reset-password';
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should show invalid link message when no token', () => {
      renderResetPasswordPage();

      expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /request new link/i })).toHaveAttribute('href', '/forgot-password');
    });

    it('focuses the missing-token heading', async () => {
      renderResetPasswordPage();

      await waitFor(() => expect(screen.getByRole('heading', { name: /invalid reset link/i })).toHaveFocus());
    });

    it('should show reset form when token is present', () => {
      renderResetPasswordPage('valid-token');

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call resetPassword with token and passwords', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successfully' });
      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      
      // Wait for form validation to complete
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reset password/i });
        expect(button).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'valid-token',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });
      }, { timeout: 3000 });
    });

    it('should show success state after reset', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successfully' });
      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      
      // Wait for form validation to complete
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reset password/i });
        expect(button).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Password Reset!' })).toHaveFocus();
      }, { timeout: 3000 });
      expect(screen.getByRole('status')).toHaveTextContent('Password reset successfully.');
      expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute('href', '/login');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'Password123!');
      await user.type(passwordInputs[1], 'DifferentPassword!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert')).toHaveFocus();
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      renderResetPasswordPage('valid-token');

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'weak');
      await user.type(passwordInputs[1], 'weak');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should allow submission when passwords match and are strong', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successfully' });
      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'StrongPassword123!');
      await user.type(passwordInputs[1], 'StrongPassword123!');
      
      // Wait for form validation to complete
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reset password/i });
        expect(button).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Password accessibility', () => {
    it('labels both fields and uses new-password autocomplete', () => {
      renderResetPasswordPage('valid-token');

      const password = screen.getByLabelText('New Password');
      const confirmation = screen.getByLabelText('Confirm New Password');
      expect(password).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
      expect(password).toBeRequired();
      expect(confirmation).toBeRequired();
    });

    it('keeps password requirements available before validation', () => {
      renderResetPasswordPage('valid-token');

      expect(screen.getByText(/must be at least 8 characters with uppercase/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable submit button when loading', async () => {
      const user = userEvent.setup();
      let resolveReset: (value: any) => void;
      const resetPromise = new Promise((resolve) => {
        resolveReset = resolve;
      });
      mockResetPassword.mockReturnValue(resetPromise);

      renderResetPasswordPage('valid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      
      // Wait for form validation to complete
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reset password/i });
        expect(button).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reset password|loading/i });
        expect(button).toBeDisabled();
      }, { timeout: 3000 });

      resolveReset!({ success: true, message: 'Password reset successfully' });
      await resetPromise;
    });
  });

  describe('Token Expiration', () => {
    it('should handle expired token error', async () => {
      const user = userEvent.setup();
      const error = new Error('Token expired');
      (error as any).response = { status: 400, data: { message: 'Reset token has expired' } };
      mockResetPassword.mockRejectedValue(error);

      renderResetPasswordPage('expired-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toHaveFocus();
    });

    it('should handle invalid token error', async () => {
      const user = userEvent.setup();
      const error = new Error('Invalid token');
      (error as any).response = { status: 400, data: { message: 'Invalid reset token' } };
      mockResetPassword.mockRejectedValue(error);

      renderResetPasswordPage('invalid-token');

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: /request new link/i })).toBeInTheDocument();
    });
  });
});
