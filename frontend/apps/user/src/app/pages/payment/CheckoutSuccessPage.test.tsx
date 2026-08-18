import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { CheckoutSuccessPage } from './CheckoutSuccessPage';
import { useCapturePayment, usePaymentStatus } from '../../hooks/useCheckout';
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
  Card: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  Button: ({ children, onClick, leftIcon, rightIcon, variant, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  ),
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock('lucide-react', () => ({
  CheckCircle: (props: any) => <span data-testid="icon-check-circle" {...props}>CheckCircleIcon</span>,
  ArrowRight: (props: any) => <span data-testid="icon-arrow-right" {...props}>ArrowRightIcon</span>,
  BookOpen: (props: any) => <span data-testid="icon-book-open" {...props}>BookOpenIcon</span>,
  Package: (props: any) => <span data-testid="icon-package" {...props}>PackageIcon</span>,
  XCircle: (props: any) => <span data-testid="icon-xcircle" {...props}>XCircleIcon</span>,
  RefreshCw: (props: any) => <span data-testid="icon-refresh" {...props}>RefreshIcon</span>,
  FileText: (props: any) => <span data-testid="icon-file-text" {...props}>FileTextIcon</span>,
  Clock: (props: any) => <span data-testid="icon-clock" {...props}>ClockIcon</span>,
}));

describe('CheckoutSuccessPage', () => {
  const mockCaptureMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureMutate.mockReset();
    mockSearchParams = new URLSearchParams();

    (useCapturePayment as any).mockReturnValue({
      mutate: mockCaptureMutate,
      isPending: false,
    });

    // Mock usePaymentStatus to return a query result object
    (usePaymentStatus as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  const expectNoSeriousAxeViolations = async (container: HTMLElement) => {
    const result = await axe.run(container, {
      // jsdom cannot calculate rendered foreground/background colors.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
  };

  describe('accessibility', () => {
    it('exposes an accessible live loading state with no serious Axe violations', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      const { container } = render(<CheckoutSuccessPage />);

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Completing Your Payment');
      expect(screen.getByRole('heading', { level: 1, name: 'Completing Your Payment' })).toBeInTheDocument();
      await expectNoSeriousAxeViolations(container);
    });

    it('labels success details, announces completion, and focuses the success heading', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: true, orderNumber: 'ORD-A11Y-1' });
      });
      const { container } = render(<CheckoutSuccessPage />);

      const heading = await screen.findByRole('heading', { level: 1, name: 'Payment Successful!' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(document.title).toBe('Payment Confirmation | EduMind');
      expect(screen.getByText('Order Number').tagName).toBe('DT');
      expect(screen.getByText('ORD-A11Y-1').tagName).toBe('DD');
      await expectNoSeriousAxeViolations(container);
    });

    it('announces capture errors, focuses the error heading, and provides recovery actions', async () => {
      mockSearchParams.set('token', 'PAYPAL-TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onError(new Error('The provider could not confirm this payment.'));
      });
      const { container } = render(<CheckoutSuccessPage />);

      const status = await screen.findByRole('status');
      const heading = screen.getByRole('heading', { level: 1, name: 'Payment Failed' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(status).toHaveTextContent('The provider could not confirm this payment.');
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Return to Cart' })).toBeInTheDocument();
      await expectNoSeriousAxeViolations(container);
    });

    it('supports keyboard access to success actions', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: true, orderNumber: 'ORD-KEYBOARD' });
      });
      render(<CheckoutSuccessPage />);

      await screen.findByRole('heading', { name: 'Payment Successful!' });
      await user.tab();
      expect(screen.getByRole('button', { name: 'Start Learning' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.LEARNING);

      await user.tab();
      expect(screen.getByRole('button', { name: 'View Order Details' })).toHaveFocus();
      await user.keyboard(' ');
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.ORDERS);
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

    it('rejects an unverified order number in the URL', () => {
      mockSearchParams.set('order', 'ORD-123456');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-123456')).not.toBeInTheDocument();
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

  describe('Flow E — forged success URLs', () => {
    it('E1: missing verification data shows recovery actions, not success', () => {
      render(<CheckoutSuccessPage />);

      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.getByText(/missing the information needed to verify/i)).toBeInTheDocument();
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    });

    it('E2: order=undefined is not displayed or treated as success', () => {
      mockSearchParams.set('order', 'undefined');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    });

    it('E3: a non-numeric orderId is rejected without an API request', () => {
      mockSearchParams.set('orderId', 'abc');
      render(<CheckoutSuccessPage />);

      expect(screen.getByText(/order ID in this link is invalid/i)).toBeInTheDocument();
      expect(usePaymentStatus).toHaveBeenCalledWith(null, expect.objectContaining({ enabled: false }));
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    });

    it('E4: a backend-confirmed failed order shows an error', async () => {
      mockSearchParams.set('orderId', '404');
      (usePaymentStatus as any).mockReturnValue({
        data: { success: false, pending: false, orderStatus: 'FAILED', message: 'Payment was declined.' },
        isLoading: false,
        isError: false,
        error: null,
      });
      render(<CheckoutSuccessPage />);

      expect(await screen.findByText('Payment was declined.')).toBeInTheDocument();
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    });

    it('E5: a pending order shows confirmation in progress', async () => {
      mockSearchParams.set('orderId', '405');
      (usePaymentStatus as any).mockReturnValue({
        data: { success: false, pending: true, orderStatus: 'PENDING', orderNumber: 'ORD-PENDING' },
        isLoading: false,
        isError: false,
        error: null,
      });
      render(<CheckoutSuccessPage />);

      expect(await screen.findByText('Payment Is Being Confirmed')).toBeInTheDocument();
      expect(screen.getByText(/ORD-PENDING/)).toBeInTheDocument();
      expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
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

    it('renders invoice from usePaymentStatus for SePay flow (orderId)', async () => {
      mockSearchParams.set('orderId', '123');
      (usePaymentStatus as any).mockReturnValue({
        data: {
          success: true,
          orderStatus: 'COMPLETED',
          orderNumber: 'ORD-SEPAY-123',
          invoiceNumber: 'INV-SEPAY-001',
          invoiceUrl: 'https://example.com/sepay-invoice.pdf',
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<CheckoutSuccessPage />);

      await waitFor(() => {
        const downloadLink = screen.getByRole('link', { name: /Download Invoice/i });
        expect(downloadLink).toBeInTheDocument();
        expect(downloadLink).toHaveAttribute('href', 'https://example.com/sepay-invoice.pdf');
        expect(screen.getByText(/INV-SEPAY-001/)).toBeInTheDocument();
        expect(screen.getByText('ORD-SEPAY-123')).toBeInTheDocument();
      });
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
    it('displays a backend-confirmed order number when available', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => {
        options.onSuccess({ success: true, orderNumber: 'ORD-DISPLAY-TEST' });
      });
      render(<CheckoutSuccessPage />);

      await screen.findByText('Payment Successful!');
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
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => options.onSuccess({ success: true }));
      render(<CheckoutSuccessPage />);

      await screen.findByText('Payment Successful!');
      await user.click(screen.getByText('Start Learning'));
      expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.LEARNING);
    });

    it('navigates to orders page on View Order Details click', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => options.onSuccess({ success: true }));
      render(<CheckoutSuccessPage />);

      await screen.findByText('Payment Successful!');
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
    it('shows confirmation email text', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => options.onSuccess({ success: true }));
      render(<CheckoutSuccessPage />);

      expect(await screen.findByText(/confirmation email has been sent/i)).toBeInTheDocument();
    });

    it('shows course access text', async () => {
      mockSearchParams.set('token', 'TOKEN');
      mockCaptureMutate.mockImplementation((_token: string, options: any) => options.onSuccess({ success: true }));
      render(<CheckoutSuccessPage />);

      expect(await screen.findByText(/You can now access your purchased courses/i)).toBeInTheDocument();
    });
  });
});
