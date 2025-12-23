import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockVerifyEmail, mockResendVerification, mockNavigate } = vi.hoisted(() => ({
  mockVerifyEmail: vi.fn(),
  mockResendVerification: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock auth service
vi.mock('@user/services/index', () => ({
  authService: {
    verifyEmail: mockVerifyEmail,
    resendVerification: mockResendVerification,
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
import { EmailVerificationPage } from './EmailVerificationPage';

// Mock shared-utils
vi.mock('@edumind/shared-utils', () => ({
  USER_ROUTES: {
    LOGIN: '/login',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, isLoading }: any) => (
    <button onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Alert: ({ message, variant }: any) => <div role="alert" data-variant={variant}>{message}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  CheckCircle: () => <span>✓</span>,
  XCircle: () => <span>✗</span>,
  Mail: () => <span>📧</span>,
  GraduationCap: () => <span>🎓</span>,
}));

// Mock window.prompt
vi.stubGlobal('prompt', vi.fn());

const renderEmailVerificationPage = (token?: string) => {
  const route = token ? `/verify-email?token=${token}` : '/verify-email';
  return render(
    <MemoryRouter initialEntries={[route]}>
      <EmailVerificationPage />
    </MemoryRouter>
  );
};

describe('EmailVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Token', () => {
    it('should show no token message', () => {
      renderEmailVerificationPage();

      expect(screen.getByRole('heading', { name: /email verification required/i })).toBeInTheDocument();
      // There are two "Resend Verification Email" buttons (error + info sections),
      // so use getAllByRole instead of the singular query.
      const resendButtons = screen.getAllByRole('button', { name: /resend verification email/i });
      expect(resendButtons.length).toBeGreaterThan(0);
    });
  });

  describe('With Token', () => {
    it('should show verifying state initially', () => {
      mockVerifyEmail.mockReturnValue(new Promise(() => {})); // Never resolves
      renderEmailVerificationPage('valid-token');

      expect(screen.getByText('Verifying Email...')).toBeInTheDocument();
    });

    it('should show success state on successful verification', async () => {
      mockVerifyEmail.mockResolvedValue({ success: true });
      renderEmailVerificationPage('valid-token');

      await waitFor(() => {
        expect(screen.getByText('Email Verified!')).toBeInTheDocument();
      });
    });

    it('should show error state on failed verification', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('Token expired'));
      renderEmailVerificationPage('invalid-token');

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      });
    });
  });

  describe('Resend Verification', () => {
    it('should call resendVerification when button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(window.prompt).mockReturnValue('test@example.com');
      mockResendVerification.mockResolvedValue({ success: true });
      renderEmailVerificationPage();

      // Multiple resend buttons exist – click the first one
      const [resendButton] = screen.getAllByRole('button', {
        name: /resend verification email/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockResendVerification).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    it('should not call resendVerification when prompt cancelled', async () => {
      const user = userEvent.setup();
      vi.mocked(window.prompt).mockReturnValue(null);
      renderEmailVerificationPage();

      const [resendButton] = screen.getAllByRole('button', {
        name: /resend verification email/i,
      });
      await user.click(resendButton);

      expect(mockResendVerification).not.toHaveBeenCalled();
    });
  });
});
