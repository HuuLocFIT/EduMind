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
  QrCode: () => <span data-testid="icon-qrcode">QrCodeIcon</span>,
  Clock: () => <span data-testid="icon-clock">ClockIcon</span>,
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircleIcon</span>,
  XCircle: () => <span data-testid="icon-xcircle">XCircleIcon</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshIcon</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeftIcon</span>,
  Smartphone: () => <span data-testid="icon-smartphone">SmartphoneIcon</span>,
  Copy: () => <span data-testid="icon-copy">CopyIcon</span>,
  Check: () => <span data-testid="icon-check">CheckIcon</span>,
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
      const expiresAt = createdTime + 30 * 60 * 1000;
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

    it('renders QR code image', () => {
      render(<SepayQrPage />);

      const qrImage = screen.getByRole('img', { name: /SePay QR Code/i });
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'https://sepay.vn/qr/test123.png');
    });

    it('displays time remaining countdown', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Time remaining:')).toBeInTheDocument();
      // Initial time should be 30:00
      expect(screen.getByText('30:00')).toBeInTheDocument();
    });

    it('displays amount and currency', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Amount:')).toBeInTheDocument();
      expect(screen.getByText(/1.250.000/)).toBeInTheDocument();
      expect(screen.getByText(/VND/)).toBeInTheDocument();
    });

    it('displays order number with copy button', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('Order:')).toBeInTheDocument();
      expect(screen.getByText('ORD-2024-001')).toBeInTheDocument();
      expect(screen.getByTestId('icon-copy')).toBeInTheDocument();
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

  describe('timer synchronization', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('uses fallback timer initially', () => {
      render(<SepayQrPage />);

      // Initial time is 30 minutes (1800 seconds)
      expect(screen.getByText('30:00')).toBeInTheDocument();
    });

    it('decrements timer every second', () => {
      render(<SepayQrPage />);

      expect(screen.getByText('30:00')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('29:59')).toBeInTheDocument();
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
  });

  describe('status polling', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('transitions to success state on COMPLETED status', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-2024-001',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('Payment Received!')).toBeInTheDocument();
      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });

    it('auto-redirects to success page after success', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-2024-001',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('Payment Received!')).toBeInTheDocument();

      // Wait for redirect timeout (2 seconds)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

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

    it('renders success confirmation', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-SUCCESS',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('Payment Received!')).toBeInTheDocument();
      expect(screen.getByText(/payment has been confirmed/i)).toBeInTheDocument();
    });

    it('shows loading indicator during redirect', () => {
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-SUCCESS',
        },
        isError: false,
      });

      render(<SepayQrPage />);

      expect(screen.getByText('Payment Received!')).toBeInTheDocument();
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText(/Redirecting to order details/i)).toBeInTheDocument();
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

      expect(screen.getByTestId('icon-copy')).toBeInTheDocument();
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

      const timerElement = screen.getByText('30:00');
      expect(timerElement).toHaveClass('text-blue-600');
    });
  });

  describe('QR code error handling', () => {
    beforeEach(() => {
      setupValidParams();
    });

    it('handles QR image load error gracefully', () => {
      render(<SepayQrPage />);

      const qrImage = screen.getByRole('img', { name: /SePay QR Code/i });

      // Use fireEvent to trigger React's onError handler
      fireEvent.error(qrImage);

      // Image should have fallback src
      expect(qrImage.getAttribute('src')).toContain('data:image/svg+xml');
    });
  });
});
