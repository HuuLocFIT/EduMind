import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutFailedPage } from './CheckoutFailedPage';
import { useCancelPayment } from '../../hooks/useCheckout';
import { USER_ROUTES } from '@edumind/shared-utils';

// Mock Dependencies
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('../../hooks/useCheckout');

vi.mock('@edumind/user-ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, onClick, leftIcon, variant, className }: any) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {leftIcon}
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  XCircle: () => <span data-testid="icon-xcircle">XCircleIcon</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshIcon</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeftIcon</span>,
  HelpCircle: () => <span data-testid="icon-help">HelpCircleIcon</span>,
  Ban: () => <span data-testid="icon-ban">BanIcon</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangleIcon</span>,
  CreditCard: () => <span data-testid="icon-credit-card">CreditCardIcon</span>,
}));

describe('CheckoutFailedPage', () => {
  const mockCancelMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    (useCancelPayment as any).mockReturnValue({
      mutate: mockCancelMutate,
      isPending: false,
    });
  });

  // Unit tests for getErrorMessage function (indirectly through rendering)
  describe('getErrorMessage', () => {
    it('returns correct message for GATEWAY_ERROR', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Gateway Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/payment gateway is temporarily unavailable/i)).toBeInTheDocument();
    });

    it('returns correct message for GATEWAY_NULL_RESPONSE', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_NULL_RESPONSE');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Service Error')).toBeInTheDocument();
      expect(screen.getByText(/payment service did not respond/i)).toBeInTheDocument();
    });

    it('returns correct message for CURRENCY_NOT_SUPPORTED', () => {
      mockSearchParams.set('errorCode', 'CURRENCY_NOT_SUPPORTED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Currency Not Supported')).toBeInTheDocument();
      expect(screen.getByText(/doesn't support the selected currency/i)).toBeInTheDocument();
    });

    it('returns correct message for AMOUNT_MISMATCH', () => {
      mockSearchParams.set('errorCode', 'AMOUNT_MISMATCH');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Amount Mismatch')).toBeInTheDocument();
      expect(screen.getByText(/discrepancy in the payment amount/i)).toBeInTheDocument();
    });

    it('returns correct message for INSTRUMENT_DECLINED', () => {
      mockSearchParams.set('errorCode', 'INSTRUMENT_DECLINED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Declined')).toBeInTheDocument();
      expect(screen.getByText(/payment method was declined/i)).toBeInTheDocument();
      // Should show reasons for this error
      expect(screen.getByText(/This might have happened because:/i)).toBeInTheDocument();
    });

    it('returns correct message for PAYER_ACTION_REQUIRED', () => {
      mockSearchParams.set('errorCode', 'PAYER_ACTION_REQUIRED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Additional Verification Required')).toBeInTheDocument();
      expect(screen.getByText(/bank requires additional verification/i)).toBeInTheDocument();
    });

    it('returns correct message for PAYPAL_STATUS_ERROR', () => {
      mockSearchParams.set('errorCode', 'PAYPAL_STATUS_ERROR');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('PayPal Error')).toBeInTheDocument();
      expect(screen.getByText(/issue with PayPal/i)).toBeInTheDocument();
    });

    it('returns correct message for PAYMENT_NOT_TRACKED', () => {
      mockSearchParams.set('errorCode', 'PAYMENT_NOT_TRACKED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Not Found')).toBeInTheDocument();
      expect(screen.getByText(/couldn't track your payment/i)).toBeInTheDocument();
    });

    it('returns correct message for PAYMENT_EXPIRED', () => {
      mockSearchParams.set('errorCode', 'PAYMENT_EXPIRED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Expired')).toBeInTheDocument();
      expect(screen.getByText(/payment session has expired/i)).toBeInTheDocument();
    });

    it('returns correct message for CONCURRENT_PROCESSING', () => {
      mockSearchParams.set('errorCode', 'CONCURRENT_PROCESSING');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Processing')).toBeInTheDocument();
      expect(screen.getByText(/payment is being processed/i)).toBeInTheDocument();
    });

    it('returns correct message for MANUAL_REFUND_REQUIRED', () => {
      mockSearchParams.set('errorCode', 'MANUAL_REFUND_REQUIRED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Refund Processing')).toBeInTheDocument();
      expect(screen.getByText(/refund requires manual processing/i)).toBeInTheDocument();
    });

    it('returns correct message for ORDER_EXPIRED', () => {
      mockSearchParams.set('errorCode', 'ORDER_EXPIRED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Order Expired')).toBeInTheDocument();
      expect(screen.getByText(/order has expired/i)).toBeInTheDocument();
    });

    it('returns correct message for RETRY_LIMIT_EXCEEDED', () => {
      mockSearchParams.set('errorCode', 'RETRY_LIMIT_EXCEEDED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Maximum Attempts Reached')).toBeInTheDocument();
      expect(screen.getByText(/exceeded the maximum number of payment attempts/i)).toBeInTheDocument();
    });

    it('returns correct message for INVALID_ORDER_STATUS', () => {
      mockSearchParams.set('errorCode', 'INVALID_ORDER_STATUS');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Invalid Order Status')).toBeInTheDocument();
      expect(screen.getByText(/order cannot be processed in its current state/i)).toBeInTheDocument();
    });

    it('returns correct message for CAPTURE_FAILED', () => {
      mockSearchParams.set('errorCode', 'CAPTURE_FAILED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Capture Failed')).toBeInTheDocument();
      expect(screen.getByText(/couldn't capture your payment/i)).toBeInTheDocument();
      // Should show reasons for this error
      expect(screen.getByText(/This might have happened because:/i)).toBeInTheDocument();
    });

    it('returns correct message for ENROLLMENT_FAILED_REFUNDED', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_REFUNDED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Enrollment Failed - Refund Issued')).toBeInTheDocument();
      expect(screen.getByText(/automatically refunded/i)).toBeInTheDocument();
    });

    it('returns correct message for ENROLLMENT_FAILED_MANUAL_REFUND', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_MANUAL_REFUND');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Enrollment Failed - Support Required')).toBeInTheDocument();
      expect(screen.getByText(/support team has been notified/i)).toBeInTheDocument();
    });

    it('returns default message for unknown error codes', () => {
      mockSearchParams.set('errorCode', 'UNKNOWN_ERROR_CODE');
      mockSearchParams.set('error', 'Something unexpected happened');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.getByText('Something unexpected happened')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders cancelled state when orderId is present without errorCode', () => {
      mockSearchParams.set('orderId', '123');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Payment Cancelled')).toBeInTheDocument();
      expect(screen.getByText(/You cancelled the payment/i)).toBeInTheDocument();
      // Should show cancellation info box
      expect(screen.getByText(/No charges have been made/i)).toBeInTheDocument();
    });

    it('renders retry button when canRetry is true', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Return to Cart')).toBeInTheDocument();
    });

    it('renders start new order button when canRetry is false', () => {
      mockSearchParams.set('errorCode', 'RETRY_LIMIT_EXCEEDED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Start New Order')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('hides retry button when RETRY_LIMIT_EXCEEDED', () => {
      mockSearchParams.set('errorCode', 'RETRY_LIMIT_EXCEEDED');
      render(<CheckoutFailedPage />);

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Start New Order')).toBeInTheDocument();
    });

    it('shows refund info section for ENROLLMENT_FAILED_REFUNDED', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_REFUNDED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Refund Status:')).toBeInTheDocument();
      expect(screen.getByText(/refund has been processed automatically/i)).toBeInTheDocument();
    });

    it('shows refund info section for ENROLLMENT_FAILED_MANUAL_REFUND', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_MANUAL_REFUND');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('What happens next:')).toBeInTheDocument();
      expect(screen.getByText(/support team will review your case/i)).toBeInTheDocument();
    });

    it('shows possible reasons for payment failures with showReasons=true', () => {
      mockSearchParams.set('errorCode', 'INSTRUMENT_DECLINED');
      render(<CheckoutFailedPage />);

      expect(screen.getByText(/This might have happened because:/i)).toBeInTheDocument();
      expect(screen.getByText(/Insufficient funds/i)).toBeInTheDocument();
      expect(screen.getByText(/Card details were entered incorrectly/i)).toBeInTheDocument();
      expect(screen.getByText(/bank declined the transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Network connection was interrupted/i)).toBeInTheDocument();
    });

    it('hides possible reasons when showReasons=false', () => {
      mockSearchParams.set('errorCode', 'ORDER_EXPIRED');
      render(<CheckoutFailedPage />);

      expect(screen.queryByText(/This might have happened because:/i)).not.toBeInTheDocument();
    });

    it('respects canRetry URL parameter when explicitly set to true', () => {
      mockSearchParams.set('errorCode', 'SOME_ERROR');
      mockSearchParams.set('canRetry', 'true');
      render(<CheckoutFailedPage />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('respects canRetry URL parameter when explicitly set to false', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      mockSearchParams.set('canRetry', 'false');
      render(<CheckoutFailedPage />);

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Start New Order')).toBeInTheDocument();
    });
  });

  describe('icon configuration', () => {
    it('shows Ban icon for cancelled state', () => {
      mockSearchParams.set('orderId', '123');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-ban')).toBeInTheDocument();
    });

    it('shows AlertTriangle icon for enrollment failures', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_REFUNDED');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
    });

    it('shows AlertTriangle icon for manual refund required', () => {
      mockSearchParams.set('errorCode', 'ENROLLMENT_FAILED_MANUAL_REFUND');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
    });

    it('shows CreditCard icon for declined payments', () => {
      mockSearchParams.set('errorCode', 'INSTRUMENT_DECLINED');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-credit-card')).toBeInTheDocument();
    });

    it('shows CreditCard icon for capture errors', () => {
      mockSearchParams.set('errorCode', 'CAPTURE_FAILED');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-credit-card')).toBeInTheDocument();
    });

    it('shows XCircle icon for other errors', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      expect(screen.getByTestId('icon-xcircle')).toBeInTheDocument();
    });
  });

  describe('cancel notification', () => {
    it('calls cancelPayment mutation when orderId is present', async () => {
      mockSearchParams.set('orderId', '456');
      render(<CheckoutFailedPage />);

      await waitFor(() => {
        expect(mockCancelMutate).toHaveBeenCalledWith(456, expect.any(Object));
      });
    });

    it('does not call cancelPayment when no orderId', () => {
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      expect(mockCancelMutate).not.toHaveBeenCalled();
    });

    it('only calls cancelPayment once even on re-render', async () => {
      mockSearchParams.set('orderId', '789');
      const { rerender } = render(<CheckoutFailedPage />);

      await waitFor(() => {
        expect(mockCancelMutate).toHaveBeenCalledTimes(1);
      });

      rerender(<CheckoutFailedPage />);

      // Should still be 1, not 2
      expect(mockCancelMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation', () => {
    it('navigates to checkout on Try Again click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      await user.click(screen.getByText('Try Again'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });

    it('navigates to cart on Return to Cart click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('errorCode', 'GATEWAY_ERROR');
      render(<CheckoutFailedPage />);

      await user.click(screen.getByText('Return to Cart'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
    });

    it('navigates to cart on Start New Order click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('errorCode', 'RETRY_LIMIT_EXCEEDED');
      render(<CheckoutFailedPage />);

      await user.click(screen.getByText('Start New Order'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
    });
  });
});
