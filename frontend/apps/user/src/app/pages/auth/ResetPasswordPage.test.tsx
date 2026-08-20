import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockResetPassword, mockValidateResetToken, mockNavigate } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
  mockValidateResetToken: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock auth service - use relative path to match component import
vi.mock('../../services/auth.service', () => ({
  authService: {
    resetPassword: mockResetPassword,
    validateResetToken: mockValidateResetToken,
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
  ArrowLeft: () => <span aria-hidden="true">←</span>,
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
    // Default: token validates successfully unless a test overrides it
    mockValidateResetToken.mockResolvedValue({ email: 'user@example.com' });
  });

  describe('Token Validation', () => {
    it('should show invalid link message when no token', () => {
      renderResetPasswordPage();

      expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /request new link/i })).toHaveAttribute('href', '/forgot-password');
      expect(mockValidateResetToken).not.toHaveBeenCalled();
    });

    it('focuses the missing-token heading', async () => {
      renderResetPasswordPage();

      await waitFor(() => expect(screen.getByRole('heading', { name: /invalid reset link/i })).toHaveFocus());
    });

    it('shows a loading state and no form while validating', () => {
      // Never resolves during this test
      mockValidateResetToken.mockReturnValue(new Promise(() => undefined));
      renderResetPasswordPage('valid-token');

      expect(screen.getByRole('heading', { name: /checking reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^reset password$/i })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    });

    it('should show reset form when token is valid', async () => {
      renderResetPasswordPage('valid-token');

      expect(mockValidateResetToken).toHaveBeenCalledWith('valid-token');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeInTheDocument();
    });

    it('shows Invalid Reset Link immediately when the token is rejected with 400 at mount', async () => {
      mockValidateResetToken.mockRejectedValue({ message: 'Bad Request', status: 400 });
      renderResetPasswordPage('expired-token');

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      });
      // The password form must never render
      expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toHaveFocus();
    });

    it('shows a service-error screen with Retry when validation fails with 5xx/429', async () => {
      mockValidateResetToken.mockRejectedValue({ message: 'Server Error', status: 500 });
      renderResetPasswordPage('some-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
      // Must not claim the token itself is invalid/expired
      expect(screen.queryByText('Invalid Reset Link')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    });

    it('re-runs validation when Retry is clicked and shows the form on success', async () => {
      const user = userEvent.setup();
      mockValidateResetToken.mockRejectedValueOnce({ message: 'Network Error', status: 0 });
      renderResetPasswordPage('some-token');

      const retryButton = await screen.findByRole('button', { name: /retry/i });

      mockValidateResetToken.mockResolvedValueOnce({ email: 'user@example.com' });
      await user.click(retryButton);

      expect(mockValidateResetToken).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call resetPassword with token and passwords', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successfully' });
      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

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

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

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

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'Password123!');
      await user.type(passwordInputs[1], 'DifferentPassword!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveFocus();
      });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

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

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

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
    it('labels both fields and uses new-password autocomplete', async () => {
      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

      const password = screen.getByLabelText('New Password');
      const confirmation = screen.getByLabelText('Confirm New Password');
      expect(password).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
      expect(password).toBeRequired();
      expect(confirmation).toBeRequired();
    });

    it('keeps password requirements available before validation', async () => {
      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByText(/must be at least 8 characters with uppercase/i)).toBeInTheDocument();
      });
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

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

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

  describe('Token Expiration on Submit', () => {
    it('400 on submit transitions to the invalid-link screen', async () => {
      const user = userEvent.setup();
      const error = { message: 'Reset token has expired', status: 400 };
      mockResetPassword.mockRejectedValue(error);

      renderResetPasswordPage('expired-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toHaveFocus();
      expect(screen.getByRole('link', { name: /request new link/i })).toBeInTheDocument();
    });

    it('500 on submit keeps the form visible and shows an error message', async () => {
      const user = userEvent.setup();
      const error = { message: 'Internal Server Error', status: 500 };
      mockResetPassword.mockRejectedValue(error);

      renderResetPasswordPage('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'NewPassword123!');
      await user.type(passwordInputs[1], 'NewPassword123!');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Internal Server Error');
      });
      // The form must still be present - not the invalid-link screen
      expect(screen.queryByText('Invalid Reset Link')).not.toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeInTheDocument();
    });
  });
});
