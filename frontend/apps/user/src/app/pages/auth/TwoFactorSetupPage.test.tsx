import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Use vi.hoisted to hoist mock function declarations
const { mockSetup2FA, mockVerify2FASetup, mockFetchCurrentUser, mockSetUser, mockNavigate } = vi.hoisted(() => ({
  mockSetup2FA: vi.fn(),
  mockVerify2FASetup: vi.fn(),
  mockFetchCurrentUser: vi.fn(),
  mockSetUser: vi.fn(),
  mockNavigate: vi.fn(),
}));

// Mock auth service
vi.mock('@user/services/index', () => ({
  authService: {
    setup2FA: mockSetup2FA,
    verify2FASetup: mockVerify2FASetup,
    fetchCurrentUser: mockFetchCurrentUser,
  },
}));

// Mock auth store
vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { id: 1, username: 'testuser', is2faEnabled: false },
    setUser: mockSetUser,
  }),
}));

// Import component after mocks
import { TwoFactorSetupPage } from './TwoFactorSetupPage';

// Mock react-router-dom
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
    PROFILE_SETTINGS: '/settings',
  },
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, type, isLoading }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardBody: ({ children }: any) => <div>{children}</div>,
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <span>🛡️</span>,
  Copy: () => <span>📋</span>,
  Check: () => <span>✓</span>,
  Download: () => <span>⬇️</span>,
  ArrowLeft: () => <span>←</span>,
  QrCode: () => <span>📱</span>,
}));

const mockSetupData = {
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUrl: 'data:image/png;base64,mockQRcode',
  backupCodes: ['ABC12345', 'DEF67890', 'GHI11111', 'JKL22222'],
};

const renderTwoFactorSetupPage = () => {
  return render(
    <BrowserRouter>
      <TwoFactorSetupPage />
    </BrowserRouter>
  );
};

describe('TwoFactorSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetup2FA.mockResolvedValue(mockSetupData);
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockSetup2FA.mockReturnValue(new Promise(() => { /* never resolves */ }));
      renderTwoFactorSetupPage();

      expect(screen.getByText('Setting up 2FA...')).toBeInTheDocument();
    });
  });

  describe('Setup Flow', () => {
    it('should render QR code after loading', async () => {
      renderTwoFactorSetupPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /scan qr code/i })).toBeInTheDocument();
      });

      expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
    });

    it('should show secret key for manual entry', async () => {
      renderTwoFactorSetupPage();

      await waitFor(() => {
        expect(screen.getByText(mockSetupData.secret)).toBeInTheDocument();
      });
    });

    it('should navigate to verify step when Continue clicked', async () => {
      const user = userEvent.setup();
      renderTwoFactorSetupPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Verify Setup')).toBeInTheDocument();
    });
  });

  describe('Verification', () => {
    it('should call verify2FASetup with code and secret', async () => {
      const user = userEvent.setup();
      mockVerify2FASetup.mockResolvedValue({ success: true });
      renderTwoFactorSetupPage();

      // Wait for setup data to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      // Go to verify step
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Enter code
      await user.type(screen.getByPlaceholderText('000000'), '123456');
      await user.click(screen.getByRole('button', { name: /verify & enable 2fa/i }));

      await waitFor(() => {
        expect(mockVerify2FASetup).toHaveBeenCalledWith({
          code: '123456',
          secret: mockSetupData.secret,
        });
      });
    });
  });
});
