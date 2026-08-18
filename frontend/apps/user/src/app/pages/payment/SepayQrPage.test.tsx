import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SepayQrPage } from './SepayQrPage';
import { usePaymentStatus, useCancelPayment, formatTimeRemaining, calculateTimeRemaining } from '../../hooks/useCheckout';
import { USER_ROUTES } from '@edumind/shared-utils';

// Mock Dependencies
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('../../hooks/useCheckout');

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

vi.mock('@edumind/user-ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, onClick, leftIcon, variant, className, disabled, isLoading }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} disabled={disabled}>
      {isLoading ? 'Loading...' : children}
      {leftIcon}
    </button>
  ),
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock('lucide-react', () => ({
  QrCode: (props: any) => <span {...props} data-testid="icon-qrcode">QrCodeIcon</span>,
  Clock: (props: any) => <span {...props} data-testid="icon-clock">ClockIcon</span>,
  CheckCircle: (props: any) => <span {...props} data-testid="icon-check-circle">CheckCircleIcon</span>,
  XCircle: (props: any) => <span {...props} data-testid="icon-xcircle">XCircleIcon</span>,
  RefreshCw: (props: any) => <span {...props} data-testid="icon-refresh">RefreshIcon</span>,
  ArrowLeft: (props: any) => <span {...props} data-testid="icon-arrow-left">ArrowLeftIcon</span>,
  Smartphone: (props: any) => <span {...props} data-testid="icon-smartphone">SmartphoneIcon</span>,
  Copy: (props: any) => <span {...props} data-testid="icon-copy">CopyIcon</span>,
  Check: (props: any) => <span {...props} data-testid="icon-check">CheckIcon</span>,
}));

describe('SepayQrPage', () => {
  const mockCancelMutate = vi.fn();
  let mockUsePaymentStatusReturn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSearchParams = new URLSearchParams();
    mockWriteText.mockClear();

    (useCancelPayment as any).mockReturnValue({
      mutate: mockCancelMutate,
      isPending: false,
    });

    mockUsePaymentStatusReturn = {
      data: null,
      isError: false,
    };
    (usePaymentStatus as any).mockReturnValue(mockUsePaymentStatusReturn);

    // Mock the helper functions
    (formatTimeRemaining as any).mockImplementation((seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    (calculateTimeRemaining as any).mockImplementation((createdAt: string | Date) => {
      const createdTime = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
      const expiresAt = createdTime + 15 * 60 * 1000;
      return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setupValidParams = () => {
    mockSearchParams.set('qrUrl', 'https://sepay.vn/qr/test123.png');
    mockSearchParams.set('orderId', '999');
    mockSearchParams.set('orderNumber', 'ORD-2024-001');
    mockSearchParams.set('amount', '1250000');
    mockSearchParams.set('currency', 'VND');
  };

  // Bank transfer details: the accessible alternative to the aria-hidden QR image.
  const setupTransferParams = () => {
    mockSearchParams.set('bankCode', 'MB');
    mockSearchParams.set('bankName', 'MB Bank');
    mockSearchParams.set('bankAccount', '1234567890');
    mockSearchParams.set('accountName', 'EDUMIND CO');
    mockSearchParams.set('transferContent', 'EDUMIND ORD-2024-001');
  };

  describe('invalid params', () => {
    it('renders error state when qrUrl is missing', () => {
      mockSearchParams.set('orderId', '999');
      // No qrUrl
      render(<SepayQrPage />);

      expect(screen.getByText('Invalid Payment Session')).toBeInTheDocument();
      expect(screen.getByText(/payment session is invalid or has expired/i)).toBeInTheDocument();
      expect(screen.getByTestId('icon-xcircle')).toBeInTheDocument();
    });

    it('renders error state when orderId is missing', () => {
      mockSearchParams.set('qrUrl', 'https://sepay.vn/qr/test.png');
      // No orderId
      render(<SepayQrPage />);

      expect(screen.getByText('Invalid Payment Session')).toBeInTheDocument();
      expect(screen.getByText('Return to Checkout')).toBeInTheDocument();
    });

    it('navigates to checkout when Return to Checkout is clicked on error', () => {
      mockSearchParams.set('qrUrl', 'https://sepay.vn/qr/test.png');
      // No orderId
      render(<SepayQrPage />);

      fireEvent.click(screen.getByText('Return to Checkout'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });
  });

  describe('scanning state', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('renders the QR code visually but hides it from assistive technology', () => {
      const { container } = render(<SepayQrPage />);

      const qrImage = container.querySelector('img');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'https://sepay.vn/qr/test123.png');
      expect(qrImage).toHaveAttribute('alt', '');
      expect(qrImage).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('displays time remaining countdown', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Time remaining:')).toBeInTheDocument();
      // Initial time should be 15:00
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('displays amount and currency', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Amount: 1,250,000 Vietnamese dong')).toHaveClass('sr-only');
      expect(screen.getByText('Amount:')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText(/1.250.000 VND/)).toHaveAttribute('aria-hidden', 'true');
    });

    it('displays order number with copy button', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Order:')).toBeInTheDocument();
      expect(screen.getByText('ORD-2024-001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy order number' })).toBeInTheDocument();
    });

    it('shows payment instructions', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('How to pay')).toBeInTheDocument();
      expect(screen.getByText(/Open your banking app/i)).toBeInTheDocument();
      expect(screen.getByText(/Select "Scan QR"/i)).toBeInTheDocument();
      expect(screen.getByText(/^Scan the QR code above$/i)).toBeInTheDocument();
      expect(screen.getByText(/do not modify/i)).toBeInTheDocument();
      expect(screen.getByText(/this page will update automatically/i)).toBeInTheDocument();
    });

    it('shows waiting indicator', () => {
      render(<SepayQrPage />);

      expect(screen.getByText(/Waiting for payment confirmation/i)).toBeInTheDocument();
    });
  });

  describe('accessible alternative to the QR image (WCAG 1.1.1)', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('renders the bank transfer details as readable text', () => {
      setupTransferParams();
      render(<SepayQrPage />);

      expect(
        screen.getByRole('heading', { level: 2, name: 'Bank transfer details' })
      ).toBeInTheDocument();
      expect(screen.getByText('Bank')).toBeInTheDocument();
      expect(screen.getByText('MB Bank')).toBeInTheDocument();
      expect(screen.getByText('Account number')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('Beneficiary')).toBeInTheDocument();
      expect(screen.getByText('EDUMIND CO')).toBeInTheDocument();
      expect(screen.getByText('Transfer content')).toBeInTheDocument();
      expect(screen.getByText('EDUMIND ORD-2024-001')).toBeInTheDocument();
    });

    it('falls back to the bank code when no display bank name is provided', () => {
      setupTransferParams();
      mockSearchParams.delete('bankName');
      render(<SepayQrPage />);

      expect(screen.getByText('MB')).toBeInTheDocument();
    });

    it('explains the recovery path when transfer details are unavailable', () => {
      render(<SepayQrPage />);

      expect(
        screen.getByRole('heading', { level: 2, name: 'Bank transfer details' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Bank transfer details are unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/contact\s+support/i)).toBeInTheDocument();
    });

    it('gives every transfer field a labelled copy button', () => {
      setupTransferParams();
      render(<SepayQrPage />);

      ['bank name', 'account number', 'beneficiary name', 'transfer content', 'amount', 'order number'].forEach(
        (label) => {
          expect(screen.getByRole('button', { name: `Copy ${label}` })).toBeInTheDocument();
        }
      );
    });

    it('copies the account number and announces the result', () => {
      setupTransferParams();
      render(<SepayQrPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy account number' }));

      expect(mockWriteText).toHaveBeenCalledWith('1234567890');
      const announcement = screen.getByText('account number copied');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement.closest('[role="status"]')).not.toBeNull();
    });

    it('clears the copy announcement so a repeated copy is announced again', () => {
      render(<SepayQrPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy order number' }));
      expect(screen.getByText('order number copied')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(screen.queryByText('order number copied')).not.toBeInTheDocument();
    });
  });

  describe('status and timing announcements', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('exposes the waiting indicator as a status region', () => {
      render(<SepayQrPage />);

      const waiting = screen.getByText(/Waiting for payment confirmation/i);
      expect(waiting.closest('[role="status"]')).not.toBeNull();
    });

    it('announces an accessible warning under the expiry threshold', () => {
      (calculateTimeRemaining as any).mockReturnValue(59);
      (usePaymentStatus as any).mockReturnValue({
        data: { createdAt: new Date().toISOString(), orderStatus: 'PENDING' },
        isError: false,
      });

      render(<SepayQrPage />);

      const warnings = screen.getAllByText(/Less than 1 minute remaining/i);
      const announcer = warnings.find((el) => el.closest('[role="status"]'));
      expect(announcer).toBeDefined();

      // The sr-only announcer's own attributes must stay fixed - only its text may
      // change - otherwise Safari/VoiceOver double-announces (attribute + text
      // mutation on the same live-region node counted as two separate events).
      expect(announcer!.closest('[role="status"]')).toHaveClass('sr-only');

      // The visually styled banner must carry no live-region semantics of its own,
      // so toggling its class/visibility never triggers a second announcement.
      const banner = warnings.find((el) => el !== announcer);
      expect(banner).toBeDefined();
      expect(banner!.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(banner!.closest('[role="status"]')).toBeNull();
    });

    it('does not warn while there is plenty of time left', () => {
      render(<SepayQrPage />);

      expect(screen.queryByText(/Less than 1 minute remaining/i)).not.toBeInTheDocument();
    });

    it('keeps the ticking countdown out of every live region (avoids per-second chatter)', () => {
      render(<SepayQrPage />);

      const timer = screen.getByText('15:00');
      expect(timer.closest('[role="status"], [aria-live]')).toBeNull();
    });
  });

  describe('timer synchronization', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('uses fallback timer initially', () => {
      render(<SepayQrPage />);

      // Initial time is 15 minutes (900 seconds)
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('decrements timer every second', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('15:00')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('14:59')).toBeInTheDocument();
    });

    it('syncs with backend createdAt on first poll response', () => {
      // Mock calculateTimeRemaining to return 25 minutes
      (calculateTimeRemaining as any).mockReturnValue(25 * 60);

      const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago

      (usePaymentStatus as any).mockReturnValue({
        data: {
          createdAt,
          orderStatus: 'PENDING',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('transitions to expired state when time runs out', () => {
      // Use mockReturnValue for stable timer value
      (calculateTimeRemaining as any).mockReturnValue(2);
      const createdAt = new Date().toISOString();
      (usePaymentStatus as any).mockReturnValue({
        data: { createdAt, orderStatus: 'PENDING' },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('00:02')).toBeInTheDocument();

      // Switch mock to return 0 and advance timer to trigger interval tick
      (calculateTimeRemaining as any).mockReturnValue(0);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('QR Code Expired')).toBeInTheDocument();
    });

    it('moves focus to the expired heading so the state change is announced', () => {
      (calculateTimeRemaining as any).mockReturnValue(2);
      const createdAt = new Date().toISOString();
      (usePaymentStatus as any).mockReturnValue({
        data: { createdAt, orderStatus: 'PENDING' },
        isError: false,
      });

      render(<SepayQrPage />);

      (calculateTimeRemaining as any).mockReturnValue(0);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('QR Code Expired')).toHaveFocus();
    });
  });

  describe('status polling', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('navigates to the success page immediately on COMPLETED status, with no intermediate screen or delay', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-2024-001',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      // Instant redirect (SC 2.2.1 G110 technique): no perceivable "Payment
      // Received!" screen, no timer to advance, no focus to manage here -
      // CheckoutSuccessPage owns the confirmation UI and its own focus.
      expect(screen.queryByText('Payment Received!')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(USER_ROUTES.CHECKOUT_SUCCESS)
      );
    });

    it('handles ORDER_EXPIRED error code', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          errorCode: 'ORDER_EXPIRED',
          message: 'Order has expired',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('QR Code Expired')).toBeInTheDocument();
    });

    it('handles PAYMENT_EXPIRED error code', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          errorCode: 'PAYMENT_EXPIRED',
          message: 'Payment expired',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('QR Code Expired')).toBeInTheDocument();
    });

    it('handles PAYMENT_FAILED error code', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          errorCode: 'PAYMENT_FAILED',
          message: 'Payment failed',
          orderStatus: 'FAILED',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(USER_ROUTES.CHECKOUT_FAILED)
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('errorCode=PAYMENT_FAILED')
      );
    });

    it('handles ORDER_CANCELLED error code', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          errorCode: 'ORDER_CANCELLED',
          message: 'Order was cancelled',
          orderStatus: 'CANCELLED',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('errorCode=ORDER_CANCELLED')
      );
    });

    it('redirects to failed page for FAILED order status', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          orderStatus: 'FAILED',
          message: 'Payment was not completed',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(USER_ROUTES.CHECKOUT_FAILED)
      );
    });

    it('redirects to failed page for CANCELLED order status', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          orderStatus: 'CANCELLED',
          message: 'Payment was cancelled',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(USER_ROUTES.CHECKOUT_FAILED)
      );
    });
  });

  describe('expired state', () => {
    beforeEach(() => {
      setupValidParams();
      // Use mockReturnValue(0) so timer syncs to expired immediately
      (calculateTimeRemaining as any).mockReturnValue(0);
      const createdAt = new Date().toISOString();
      (usePaymentStatus as any).mockReturnValue({
        data: { createdAt, orderStatus: 'PENDING' },
        isError: false,
      });
    });

    it('renders expired UI with retry option', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('QR Code Expired')).toBeInTheDocument();
      expect(screen.getByText(/QR code has expired/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders return to cart button', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Return to Cart')).toBeInTheDocument();
    });

    it('navigates to checkout on Try Again click', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try Again'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });

    it('navigates to cart on Return to Cart click', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Return to Cart')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Return to Cart'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('navigates to the success page immediately, with no intermediate confirmation UI', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-SUCCESS',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(USER_ROUTES.CHECKOUT_SUCCESS)
      );
      expect(screen.queryByText('Payment Received!')).not.toBeInTheDocument();
    });
  });

  describe('user actions', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('copies order number to clipboard', () => {
      render(<SepayQrPage />);

      const copyButton = screen.getByTitle('Copy order number');
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('ORD-2024-001');
    });

    it('shows check icon after copy', () => {
      render(<SepayQrPage />);

      const copyButton = screen.getByTitle('Copy order number');
      fireEvent.click(copyButton);

      expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    });

    it('reverts to copy icon after timeout', () => {
      render(<SepayQrPage />);

      const copyButton = screen.getByTitle('Copy order number');
      fireEvent.click(copyButton);

      expect(screen.getByTestId('icon-check')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('icon-copy').length).toBeGreaterThan(0);
    });

    it('handles cancel payment', () => {
      render(<SepayQrPage />);

      fireEvent.click(screen.getByText('Cancel Payment'));

      expect(mockCancelMutate).toHaveBeenCalledWith(999);
    });

    it('navigates to failed page on cancel', () => {
      render(<SepayQrPage />);

      fireEvent.click(screen.getByText('Cancel Payment'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`${USER_ROUTES.CHECKOUT_FAILED}?orderId=999`)
      );
    });
  });

  describe('timer display formatting', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('shows red color when less than 60 seconds remaining', () => {
      // Use mockReturnValue for stable timer value
      (calculateTimeRemaining as any).mockReturnValue(59);
      const createdAt = new Date().toISOString();
      (usePaymentStatus as any).mockReturnValue({
        data: { createdAt, orderStatus: 'PENDING' },
        isError: false,
      });

      render(<SepayQrPage />);

      const timerElement = screen.getByText('00:59');
      expect(timerElement).toHaveClass('text-red-600');
    });

    it('shows blue color when more than 60 seconds remaining', () => {
      render(<SepayQrPage />);

      const timerElement = screen.getByText('15:00');
      expect(timerElement).toHaveClass('text-blue-600');
    });
  });

  describe('QR code error handling', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('handles QR image load error gracefully', () => {
      const { container } = render(<SepayQrPage />);

      const qrImage = container.querySelector('img') as HTMLImageElement;

      // Use fireEvent to trigger React's onError handler
      fireEvent.error(qrImage);

      // Image should have fallback src
      expect(qrImage.getAttribute('src')).toContain('data:image/svg+xml');
    });
  });
});
