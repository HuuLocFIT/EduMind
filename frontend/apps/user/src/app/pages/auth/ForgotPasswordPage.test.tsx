import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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
import { ForgotPasswordPage, RESEND_COOLDOWN_SECONDS } from './ForgotPasswordPage';

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
  // Mirrors the real Button (frontend/libs/user/ui/src/lib/Button/Button.tsx):
  // native `disabled`/`aria-busy` are driven only by `isLoading`, while any other
  // forwarded prop (aria-disabled, aria-describedby, className, etc.) passes
  // through untouched. Custom non-DOM Button props (variant/size/fullWidth/
  // leftIcon/rightIcon) are stripped so they don't leak onto the DOM node and
  // trigger "unknown DOM attribute" console warnings that would pollute the
  // act()-warning assertions in this file.
  Button: ({
    children,
    onClick,
    type,
    isLoading,
    variant,
    size,
    fullWidth,
    leftIcon,
    rightIcon,
    ...props
  }: any) => (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading ? 'true' : 'false'}
      {...props}
    >
      {isLoading ? `Loading: ${children}` : children}
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
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();

      await user.type(screen.getByRole('textbox', { name: /email address/i }), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      await screen.findByRole('heading', { name: /check your email/i });

      // First send starts a cooldown, so Resend must wait it out before it
      // will actually call the service again.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });

      const resend = screen.getByRole('button', { name: /resend email/i });
      resend.focus();
      await user.keyboard('{Enter}');

      const announcement = await screen.findByText(
        `Reset email sent again. You can resend in ${RESEND_COOLDOWN_SECONDS} seconds.`,
      );
      expect(announcement).toHaveAttribute('role', 'status');
      expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');

      vi.useRealTimers();
    });
  });

  describe('Resend cooldown', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const sendFirstEmail = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByRole('textbox', { name: /email address/i }), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      await screen.findByRole('heading', { name: /check your email/i });
    };

    it('disables Resend via aria-disabled (not native disabled), keeping it focusable, and shows the 60s hint', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      expect(resend).toHaveAttribute('aria-disabled', 'true');
      expect(resend).not.toBeDisabled();
      expect(screen.getByText('Resend available in 60s')).toBeInTheDocument();

      resend.focus();
      expect(resend).toHaveFocus();
    });

    it('counts down each second and clears aria-disabled/aria-describedby entirely at zero', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      expect(screen.getByText('Resend available in 60s')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByText('Resend available in 59s')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByText('Resend available in 58s')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync((RESEND_COOLDOWN_SECONDS - 2) * 1000);
      });

      expect(resend).not.toHaveAttribute('aria-disabled');
      expect(resend).not.toHaveAttribute('aria-describedby');
      expect(screen.queryByText(/Resend available in/)).not.toBeInTheDocument();
    });

    it('does not call forgotPassword again on click or Enter while cooling down', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      mockForgotPassword.mockClear();
      const resend = screen.getByRole('button', { name: 'Resend Email' });

      await user.click(resend);
      expect(mockForgotPassword).not.toHaveBeenCalled();

      resend.focus();
      await user.keyboard('{Enter}');
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it('keeps the accessible name exactly "Resend Email" throughout the entire cooldown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      expect(screen.getByRole('button', { name: 'Resend Email' })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(screen.getByRole('button', { name: 'Resend Email' })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(screen.getByRole('button', { name: 'Resend Email' })).toBeInTheDocument();
    });

    it('never places the ticking countdown number inside a live region', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      for (let remaining = RESEND_COOLDOWN_SECONDS; remaining > RESEND_COOLDOWN_SECONDS - 5; remaining--) {
        const tick = screen.getByText(`Resend available in ${remaining}s`);
        expect(tick.closest('[role="status"], [aria-live]')).toBeNull();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }
    });

    it('never has more than one resend-feedback status region at a time', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      const resendStatuses = () =>
        screen
          .getAllByRole('status')
          .filter((el) => /resend/i.test(el.textContent ?? ''));

      // Right after the first send, no resend-specific status message yet.
      expect(resendStatuses()).toHaveLength(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });
      // Cooldown-expired announcement: exactly one.
      expect(resendStatuses()).toHaveLength(1);

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      await user.click(resend);
      await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(resendStatuses()).toHaveLength(1));
    });

    it('does not add any resend/cooldown-related live-region announcement on the first send', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      // The "sent instructions" text uses role="text" (read via the
      // heading's aria-describedby on focus, not as a live region), so the
      // only role="status" node at this point is the always-mounted (but
      // still empty) resend-feedback region.
      const statuses = screen.getAllByRole('status');
      expect(statuses).toHaveLength(1);
      expect(statuses.some((el) => /resend/i.test(el.textContent ?? ''))).toBe(false);

      const confirmationDetail = screen.getByText(/We've sent password reset instructions/i);
      expect(confirmationDetail.closest('[role="text"]')).not.toBeNull();
      expect(
        screen.getByRole('heading', { name: /check your email/i }),
      ).toHaveAttribute('aria-describedby', confirmationDetail.closest('[role="text"]')?.id);
    });

    it('shows aria-busy on Resend while a resend request is in flight', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });

      let resolveResend: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });
      mockForgotPassword.mockReturnValue(resendPromise);

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      await user.click(resend);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend email/i })).toHaveAttribute('aria-busy', 'true');
      });

      resolveResend!({ success: true });
      await act(async () => {
        await resendPromise;
      });
    });

    it('restarts the cooldown and announces the merged message on a successful resend', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });
      expect(screen.queryByText('Resend available in 60s')).not.toBeInTheDocument();

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      await user.click(resend);

      const announcement = await screen.findByText(
        `Reset email sent again. You can resend in ${RESEND_COOLDOWN_SECONDS} seconds.`,
      );
      expect(announcement).toHaveAttribute('role', 'status');
      expect(screen.getByText('Resend available in 60s')).toBeInTheDocument();
    });

    it('does not start a cooldown on a failed resend, and allows an immediate retry', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      renderForgotPasswordPage();
      await sendFirstEmail(user);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });

      mockForgotPassword.mockClear();
      mockForgotPassword.mockRejectedValueOnce(new Error('Network error'));

      const resend = screen.getByRole('button', { name: 'Resend Email' });
      await user.click(resend);

      // Scoped, not screen.findByRole('alert') alone: the confirmation view
      // always also shows the persistent "link expires in 1 hour" info alert,
      // so an unscoped query is ambiguous once a resend error alert appears too.
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.some((el) => /network error/i.test(el.textContent ?? ''))).toBe(true);
      });
      expect(resend).not.toHaveAttribute('aria-disabled');

      mockForgotPassword.mockResolvedValueOnce({ success: true });
      await user.click(resend);

      await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledTimes(2));
    });

    it('produces no act()/setState-after-unmount warnings when unmounted during an active cooldown', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockForgotPassword.mockResolvedValue({ success: true });
      const { unmount } = renderForgotPasswordPage();
      await sendFirstEmail(user);

      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
