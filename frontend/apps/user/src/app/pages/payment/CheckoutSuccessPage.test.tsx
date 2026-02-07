import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutSuccessPage } from './CheckoutSuccessPage';
import { useCapturePayment } from '../../hooks/useCheckout';
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
  Button: ({ children, onClick, rightIcon, variant, className }: any) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {children}
      {rightIcon}
    </button>
  ),
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircleIcon</span>,
  ArrowRight: () => <span data-testid="icon-arrow-right">ArrowRightIcon</span>,
  BookOpen: () => <span data-testid="icon-book-open">BookOpenIcon</span>,
  Package: () => <span data-testid="icon-package">PackageIcon</span>,
  XCircle: () => <span data-testid="icon-xcircle">XCircleIcon</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshIcon</span>,
  FileText: () => <span data-testid="icon-file-text">FileTextIcon</span>,
  Clock: () => <span data-testid="icon-clock">ClockIcon</span>,
}));

describe('CheckoutSuccessPage', () => {
  const mockCaptureMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    (useCapturePayment as any).mockReturnValue({
      mutate: mockCaptureMutate,
      isPending: false,
    });
  });

  describe('page states', () => {
    it('renders loading state when token is present', () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN-123');
      render(<CheckoutSuccessPage />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Completing Your Payment')).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we confirm your payment with PayPal/i)).toBeInTheDocument();
    });

    it('renders success state for direct success (orderNumberParam)', () => {
      mockSearchParams.set('order', 'ORD-123456');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      expect(screen.getByText('ORD-123456')).toBeInTheDocument();
      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });

    it('renders error state when capture fails', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN-123');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: false, message: 'Payment capture failed' });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('Payment capture failed')).toBeInTheDocument();
        expect(screen.getByTestId('icon-xcircle')).toBeInTheDocument();
      });
    });
  });

  describe('PayPal capture flow', () => {
    it('calls capturePayment when token is present', async () => {
      mockSearchParams.set('token', 'PAYPAL-ORDER-ID');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: true, orderNumber: 'ORD-CAPTURED' });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(mockCaptureMutate).toHaveBeenCalledWith('PAYPAL-ORDER-ID', expect.any(Object));
      });
    });

    it('sets success state on successful capture', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-SUCCESS-123',
          totalAmount: 99.99,
          currency: 'USD',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
        expect(screen.getByText('ORD-SUCCESS-123')).toBeInTheDocument();
      });
    });

    it('sets error state on failed capture', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: false,
          message: 'Insufficient funds',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
      });
    });

    it('handles capture mutation error', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onError(new Error('Network error'));
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('does not call capture when no token', () => {
      mockSearchParams.set('order', 'ORD-DIRECT');
      render(<CheckoutSuccessPage />);

      expect(mockCaptureMutate).not.toHaveBeenCalled();
    });
  });

  describe('formatCurrency', () => {
    it('formats USD correctly', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          localAmount: 49.99,
          localCurrency: 'USD',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('$49.99')).toBeInTheDocument();
      });
    });

    it('formats VND with Vietnamese locale and no decimals', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          localAmount: 1250000,
          localCurrency: 'VND',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        // VND formatting in vi-VN locale
        expect(screen.getByText(/1\.250\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('invoice section', () => {
    it('renders download link when invoiceNumber and invoiceUrl present', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          invoiceNumber: 'INV-2024-001',
          invoiceUrl: 'https://example.com/invoice.pdf',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        const downloadLink = screen.getByRole('link', { name: /Download Invoice/i });
        expect(downloadLink).toBeInTheDocument();
        expect(downloadLink).toHaveAttribute('href', 'https://example.com/invoice.pdf');
        expect(screen.getByText(/INV-2024-001/)).toBeInTheDocument();
      });
    });

    it('renders "Invoice will be generated shortly" when no invoiceNumber', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          // No invoiceNumber or invoiceUrl
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Invoice will be generated shortly')).toBeInTheDocument();
        expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
      });
    });

    it('renders nothing when no captureResult (direct order param)', () => {
      mockSearchParams.set('order', 'ORD-DIRECT');
      render(<CheckoutSuccessPage />);

      // No invoice section elements
      expect(screen.queryByText(/Download Invoice/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Invoice will be generated shortly')).not.toBeInTheDocument();
    });
  });

  describe('local currency display', () => {
    it('shows local amount in VND for SePay payments', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          localAmount: 625000,
          localCurrency: 'VND',
          totalAmount: 25,
          currency: 'USD',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Amount Paid')).toBeInTheDocument();
        // Check for VND amount
        expect(screen.getByText(/625\.000/)).toBeInTheDocument();
      });
    });

    it('shows USD equivalent in parentheses when currencies differ', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          localAmount: 625000,
          localCurrency: 'VND',
          totalAmount: 25,
          currency: 'USD',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        // Check for USD equivalent in parentheses
        expect(screen.getByText(/\(\$25\.00\)/)).toBeInTheDocument();
      });
    });

    it('does not show USD equivalent when currencies are same', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          orderNumber: 'ORD-1',
          localAmount: 99.99,
          localCurrency: 'USD',
          totalAmount: 99.99,
          currency: 'USD',
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        // Should not show parenthesized amount when same currency
        const amountSection = screen.getByText('Amount Paid').parentElement;
        expect(amountSection?.textContent).not.toMatch(/\(\$/);
      });
    });

    it('does not show local currency section when not available', () => {
      mockSearchParams.set('order', 'ORD-DIRECT');
      render(<CheckoutSuccessPage />);

      expect(screen.queryByText('Amount Paid')).not.toBeInTheDocument();
    });
  });

  describe('order number display', () => {
    it('displays order number when available', () => {
      mockSearchParams.set('order', 'ORD-DISPLAY-TEST');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText('Order Number')).toBeInTheDocument();
      expect(screen.getByText('ORD-DISPLAY-TEST')).toBeInTheDocument();
    });

    it('handles missing order number gracefully', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({
          success: true,
          // No orderNumber
        });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
        // Order number section should not appear if null
        expect(screen.queryByText('Order Number')).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to learning page on Start Learning click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('order', 'ORD-123');
      render(<CheckoutSuccessPage />);

      await user.click(screen.getByText('Start Learning'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.LEARNING);
    });

    it('navigates to orders page on View Order Details click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('order', 'ORD-123');
      render(<CheckoutSuccessPage />);

      await user.click(screen.getByText('View Order Details'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.ORDERS);
    });

    it('navigates to checkout on Try Again from error state', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: false, message: 'Failed' });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try Again'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });

    it('navigates to cart on Return to Cart from error state', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: false, message: 'Failed' });
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        expect(screen.getByText('Return to Cart')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Return to Cart'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
    });
  });

  describe('UI elements', () => {
    it('shows confirmation email text', () => {
      mockSearchParams.set('order', 'ORD-123');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText(/confirmation email has been sent/i)).toBeInTheDocument();
    });

    it('shows course access text', () => {
      mockSearchParams.set('order', 'ORD-123');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText(/You can now access your purchased courses/i)).toBeInTheDocument();
    });
  });
});
