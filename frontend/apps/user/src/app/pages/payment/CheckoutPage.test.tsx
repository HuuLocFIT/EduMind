import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutPage } from './CheckoutPage';
import { useCheckout, useCheckoutPreview, useDirectCheckout, useDirectCheckoutPreview } from '../../hooks/useCheckout';
import { useCheckoutStore } from '../../stores/checkout.store';
import { useCartStore } from '../../stores/cart.store';
import { PaymentMethod } from '@edumind/shared-constants';
import { useSearchParams } from 'react-router-dom';
import { USER_ROUTES } from '@edumind/shared-utils';
import { useToast } from '@edumind/user-ui';

// Mock crypto.randomUUID for idempotency key generation
const mockUUID = 'test-uuid-1234-5678-90ab-cdef';
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
});

// Mock Dependencies
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../hooks/useCheckout');
vi.mock('../../stores/checkout.store');
vi.mock('../../stores/cart.store');

// Mock @tanstack/react-query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled, isLoading, leftIcon, rightIcon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {leftIcon}
      {isLoading ? 'Processing...' : children}
      {rightIcon}
    </button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Loading: () => <div>Loading...</div>,
  PriceTag: ({ price }: any) => <span>${price}</span>,
  useToast: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  CreditCard: () => <span>CreditCardIcon</span>,
  Wallet: () => <span>WalletIcon</span>,
  ArrowLeft: () => <span>ArrowLeftIcon</span>,
  ArrowRight: (props: any) => <svg data-testid="arrow-right-icon" {...props} />,
  ShieldCheck: (props: any) => <svg data-testid="shield-check-icon" {...props} />,
  Lock: (props: any) => <svg data-testid="lock-icon" {...props} />,
  AlertTriangle: () => <span>AlertTriangleIcon</span>,
}));

describe('CheckoutPage', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  
  // Checkout Store Mocks
  const mockSetPaymentMethod = vi.fn();
  const mockSetStep = vi.fn();
  const mockSetResult = vi.fn();
  const mockResetCheckout = vi.fn();
  
  // Cart Store Mocks
  const mockClearCart = vi.fn();
  
  // Hooks Mocks
  const mockCheckoutMutate = vi.fn();
  const mockDirectCheckoutMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockInvalidateQueries.mockClear();

    (useToast as any).mockReturnValue({
      success: mockShowSuccess,
      error: mockShowError,
    });

    (useCheckoutStore as any).mockReturnValue({
      selectedPaymentMethod: null,
      setPaymentMethod: mockSetPaymentMethod,
      setStep: mockSetStep,
      setResult: mockSetResult,
      reset: mockResetCheckout,
    });

    (useCartStore as any).mockReturnValue({
      clearCart: mockClearCart,
    });

    // Default implementations for hooks
    (useCheckoutPreview as any).mockReturnValue({ data: null, isLoading: false, error: null });
    (useDirectCheckoutPreview as any).mockReturnValue({ data: null, isLoading: false, error: null });
    
    (useCheckout as any).mockReturnValue({
      mutateAsync: mockCheckoutMutate,
      isPending: false,
    });
    
    (useDirectCheckout as any).mockReturnValue({
      mutateAsync: mockDirectCheckoutMutate,
      isPending: false,
    });
  });

  const mockCartPreviewData = {
    items: [{ courseId: 1, courseTitle: 'React Course', effectivePrice: 100 }],
    subtotal: 100,
    totalAmount: 100,
    itemCount: 1,
    cartSignature: 'test-cart-signature-abc123',
  };

  it('renders loading state', () => {
    (useCheckoutPreview as any).mockReturnValue({ isLoading: true });
    const { container } = render(<CheckoutPage />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('redirects to cart if cart is empty (Cart Mode)', () => {
    (useCheckoutPreview as any).mockReturnValue({ 
      data: { itemCount: 0 }, 
      isLoading: false 
    });
    
    render(<CheckoutPage />);
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
  });

  it('renders cart checkout preview correctly', () => {
    (useCheckoutPreview as any).mockReturnValue({ 
      data: mockCartPreviewData,
      isLoading: false 
    });

    render(<CheckoutPage />);
    
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('React Course')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
  });

  it('renders direct checkout preview correctly (Buy Now)', () => {
    mockSearchParams.set('courseId', '99');
    
    (useDirectCheckoutPreview as any).mockReturnValue({
      data: { ...mockCartPreviewData, items: [{ courseId: 99, courseTitle: 'Direct Course', courseSlug: 'direct-course' }] },
      isLoading: false
    });

    render(<CheckoutPage />);
    
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
    expect(screen.getByText('Direct Course')).toBeInTheDocument();
    
    // Should NOT call cart preview
    expect(useCheckoutPreview).toHaveBeenCalledWith(false); 
    // Should call direct preview
    expect(useDirectCheckoutPreview).toHaveBeenCalledWith(99, true);
  });

  it('navigates back to the course slug from direct checkout', async () => {
    const user = userEvent.setup();
    mockSearchParams.set('courseId', '99');
    (useDirectCheckoutPreview as any).mockReturnValue({
      data: {
        ...mockCartPreviewData,
        items: [{ courseId: 99, courseTitle: 'Direct Course', courseSlug: 'direct-course' }],
      },
      isLoading: false,
      error: null,
    });

    render(<CheckoutPage />);
    await user.click(screen.getByText('Back to course'));

    expect(mockNavigate).toHaveBeenCalledWith('/courses/direct-course');
  });

  it('navigates back to the cart from cart checkout', async () => {
    const user = userEvent.setup();
    (useCheckoutPreview as any).mockReturnValue({
      data: mockCartPreviewData,
      isLoading: false,
      error: null,
    });

    render(<CheckoutPage />);
    await user.click(screen.getByText('Back to cart'));

    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
  });

  it('falls back to the courses page when a direct checkout preview has no matching slug', async () => {
    const user = userEvent.setup();
    mockSearchParams.set('courseId', '99');
    (useDirectCheckoutPreview as any).mockReturnValue({
      data: {
        ...mockCartPreviewData,
        items: [{ courseId: 100, courseTitle: 'Different Course', courseSlug: 'different-course' }],
      },
      isLoading: false,
      error: null,
    });

    render(<CheckoutPage />);
    await user.click(screen.getByText('Back to course'));

    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.COURSES);
  });

  it('handles payment method selection', async () => {
    const user = userEvent.setup();
    (useCheckoutPreview as any).mockReturnValue({ 
      data: mockCartPreviewData,
      isLoading: false 
    });
    
    render(<CheckoutPage />);
    
    // Click PayPal
    await user.click(screen.getByText('PayPal'));
    expect(mockSetPaymentMethod).toHaveBeenCalledWith(PaymentMethod.PAYPAL);
  });

  it('handles successful cart checkout', async () => {
    const user = userEvent.setup();
    (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false });
    (useCheckoutStore as any).mockReturnValue({
      selectedPaymentMethod: PaymentMethod.PAYPAL,
      setPaymentMethod: mockSetPaymentMethod,
      setStep: mockSetStep,
      setResult: mockSetResult,
      reset: mockResetCheckout,
    });
    
    mockCheckoutMutate.mockResolvedValue({ 
      success: true, 
      orderNumber: 'ORD-123' 
    });

    render(<CheckoutPage />);
    
    // Click Complete Order
    await user.click(screen.getByText('Complete Order'));

    expect(mockSetStep).toHaveBeenCalledWith('processing');
    expect(mockCheckoutMutate).toHaveBeenCalled();
    expect(mockSetResult).toHaveBeenCalledWith({ orderNumber: 'ORD-123', redirectUrl: undefined });
    expect(mockClearCart).toHaveBeenCalled(); // Should clear cart
    expect(mockNavigate).toHaveBeenCalledWith(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=ORD-123`);
  });
  
  it('handles successful direct checkout', async () => {
    const user = userEvent.setup();
    mockSearchParams.set('courseId', '99');
    
    (useDirectCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false });
    (useCheckoutStore as any).mockReturnValue({
      selectedPaymentMethod: PaymentMethod.SEPAY,
      setPaymentMethod: mockSetPaymentMethod,
      setStep: mockSetStep,
      setResult: mockSetResult,
      reset: mockResetCheckout,
    });

    mockDirectCheckoutMutate.mockResolvedValue({ 
      success: true, 
      orderNumber: 'ORD-999' 
    });

    render(<CheckoutPage />);
    
    await user.click(screen.getByText('Buy Now')); // Button calls same handler but might have diff text? 
    // Wait, let's check button text. "Complete Order" is dynamic based on isPending.
    // Actually the header says "Buy Now", button says "Complete Order" or "Pay Now" on mobile.
    // Let's target text "Complete Order" which is default desktop text.
    await user.click(screen.getByText('Complete Order'));

    expect(mockDirectCheckoutMutate).toHaveBeenCalled();
    expect(mockClearCart).not.toHaveBeenCalled(); // Direct checkout implies NOT clearing whole cart usually?
    // In our implementation logic: if (!isDirectCheckout) { clearCart(); }
    // So for direct checkout, it should NOT be called.
  });

  it('handles checkout failure', async () => {
    const user = userEvent.setup();
    (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false });
    (useCheckoutStore as any).mockReturnValue({
      selectedPaymentMethod: PaymentMethod.PAYPAL,
      setPaymentMethod: mockSetPaymentMethod,
      setStep: mockSetStep,
      setResult: mockSetResult,
      reset: mockResetCheckout,
    });
    
    const errorMsg = 'Insufficient funds';
    mockCheckoutMutate.mockResolvedValue({ 
      success: false, 
      message: errorMsg 
    });

    render(<CheckoutPage />);
    await user.click(screen.getByText('Complete Order'));

    expect(mockSetStep).toHaveBeenCalledWith('failed');
    expect(mockSetResult).toHaveBeenCalledWith({ errorMessage: errorMsg });
    expect(mockNavigate).toHaveBeenCalledWith(`${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(errorMsg)}`);
  });

  it('renders error state on load failure', async () => {
    const user = userEvent.setup();
    (useCheckoutPreview as any).mockReturnValue({
      error: new Error('Load failed'),
      isLoading: false
    });

    render(<CheckoutPage />);

    expect(screen.getByText('Checkout Error')).toBeInTheDocument();
    expect(screen.getByText('Load failed')).toBeInTheDocument();

    await user.click(screen.getByText('Return to Cart'));
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
  });

  // Tests for idempotencyKey and cartSignature (FIX #12)
  describe('idempotency and cart signature', () => {
    it('generates idempotencyKey and includes cartSignature in cart checkout request', async () => {
      const user = userEvent.setup();
      (useCheckoutPreview as any).mockReturnValue({
        data: mockCartPreviewData,
        isLoading: false
      });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });

      mockCheckoutMutate.mockResolvedValue({
        success: true,
        orderNumber: 'ORD-123'
      });

      render(<CheckoutPage />);

      await user.click(screen.getByText('Complete Order'));

      // Verify checkout was called with idempotencyKey and cartSignature
      expect(mockCheckoutMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: PaymentMethod.PAYPAL,
          idempotencyKey: mockUUID,
          cartSignature: 'test-cart-signature-abc123',
        })
      );
    });

    it('generates unique idempotencyKey for each checkout attempt', async () => {
      const user = userEvent.setup();
      (useCheckoutPreview as any).mockReturnValue({
        data: mockCartPreviewData,
        isLoading: false
      });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.SEPAY,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });

      mockCheckoutMutate.mockResolvedValue({
        success: true,
        orderNumber: 'ORD-456'
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      // Verify crypto.randomUUID was called
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    it('includes idempotencyKey in direct checkout request', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('courseId', '99');

      const directPreviewData = {
        ...mockCartPreviewData,
        items: [{ courseId: 99, courseTitle: 'Direct Course', effectivePrice: 50 }],
      };

      (useDirectCheckoutPreview as any).mockReturnValue({
        data: directPreviewData,
        isLoading: false
      });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });

      mockDirectCheckoutMutate.mockResolvedValue({
        success: true,
        orderNumber: 'ORD-DIRECT-789'
      });

      render(<CheckoutPage />);

      await user.click(screen.getByText('Complete Order'));

      // Verify direct checkout was called with idempotencyKey
      expect(mockDirectCheckoutMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 99,
          paymentMethod: PaymentMethod.PAYPAL,
          idempotencyKey: mockUUID,
        })
      );

      // Direct checkout should NOT include cartSignature (only cart checkout does)
      expect(mockDirectCheckoutMutate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          cartSignature: expect.anything(),
        })
      );
    });

    it('handles checkout without cartSignature when preview does not include it', async () => {
      const user = userEvent.setup();
      const previewWithoutSignature = {
        ...mockCartPreviewData,
        cartSignature: undefined,
      };

      (useCheckoutPreview as any).mockReturnValue({
        data: previewWithoutSignature,
        isLoading: false
      });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });

      mockCheckoutMutate.mockResolvedValue({
        success: true,
        orderNumber: 'ORD-NO-SIG'
      });

      render(<CheckoutPage />);

      await user.click(screen.getByText('Complete Order'));

      // Should still call checkout with undefined cartSignature
      expect(mockCheckoutMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: mockUUID,
          cartSignature: undefined,
        })
      );
    });
  });

  // Tests for error handling in catch block (FIX #13)
  describe('checkout error handling', () => {
    beforeEach(() => {
      (useCheckoutPreview as any).mockReturnValue({
        data: mockCartPreviewData,
        isLoading: false
      });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });
    });

    it('handles CART_CHANGED error by refreshing preview', async () => {
      const user = userEvent.setup();

      mockCheckoutMutate.mockRejectedValue({
        errorCode: 'CART_CHANGED',
        message: 'Cart was modified',
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Your cart was updated. Please review and try again.');
        expect(mockSetStep).toHaveBeenCalledWith('payment');
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['checkout', 'preview'] });
      });
    });

    it('handles ORDER_EXPIRED error by navigating to cart', async () => {
      const user = userEvent.setup();
      mockCheckoutMutate.mockRejectedValue({
        errorCode: 'ORDER_EXPIRED',
        message: 'Order has expired',
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('This order has expired. Please start a new checkout.');
        expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
      });
    });

    it('handles CHECKOUT_IN_PROGRESS error by navigating to order', async () => {
      const user = userEvent.setup();
      mockCheckoutMutate.mockRejectedValue({
        errorCode: 'CHECKOUT_IN_PROGRESS',
        message: 'Checkout already in progress',
        orderId: 123,
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('You have an active order in progress. Please complete or cancel it first.');
        expect(mockNavigate).toHaveBeenCalledWith(`${USER_ROUTES.ORDERS}/123`);
      });
    });

    it('handles RETRY_LIMIT_EXCEEDED by redirecting to failed page', async () => {
      const user = userEvent.setup();
      mockCheckoutMutate.mockRejectedValue({
        errorCode: 'RETRY_LIMIT_EXCEEDED',
        message: 'Maximum attempts exceeded',
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Maximum payment attempts reached. Please start a new order.');
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining(`${USER_ROUTES.CHECKOUT_FAILED}?error=`)
        );
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('errorCode=RETRY_LIMIT_EXCEEDED')
        );
      });
    });

    it('handles unknown errors by navigating to failed page', async () => {
      const user = userEvent.setup();
      mockCheckoutMutate.mockRejectedValue({
        errorCode: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
      });

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockSetStep).toHaveBeenCalledWith('failed');
        expect(mockShowError).toHaveBeenCalledWith('Something went wrong');
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining(USER_ROUTES.CHECKOUT_FAILED)
        );
      });
    });

    it('handles errors without errorCode', async () => {
      const user = userEvent.setup();
      mockCheckoutMutate.mockRejectedValue(new Error('Network error'));

      render(<CheckoutPage />);
      await user.click(screen.getByText('Complete Order'));

      await waitFor(() => {
        expect(mockSetStep).toHaveBeenCalledWith('failed');
        expect(mockShowError).toHaveBeenCalledWith('Network error');
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining(USER_ROUTES.CHECKOUT_FAILED)
        );
      });
    });
  });

  // Tests for warnings banner
  describe('warnings banner', () => {
    it('renders warnings banner when preview has warnings', () => {
      const previewWithWarnings = {
        ...mockCartPreviewData,
        warnings: ['Price has changed for "React Course"', 'Coupon expired'],
      };

      (useCheckoutPreview as any).mockReturnValue({
        data: previewWithWarnings,
        isLoading: false
      });

      render(<CheckoutPage />);

      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Price has changed for "React Course"')).toBeInTheDocument();
      expect(screen.getByText('Coupon expired')).toBeInTheDocument();
    });

    it('does not render warnings banner when no warnings', () => {
      (useCheckoutPreview as any).mockReturnValue({
        data: mockCartPreviewData,
        isLoading: false
      });

      render(<CheckoutPage />);

      expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    });

    it('does not render warnings banner when warnings array is empty', () => {
      const previewWithEmptyWarnings = {
        ...mockCartPreviewData,
        warnings: [],
      };

      (useCheckoutPreview as any).mockReturnValue({
        data: previewWithEmptyWarnings,
        isLoading: false
      });

      render(<CheckoutPage />);

      expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    });
  });

  describe('checkout accessibility', () => {
    it('uses a heading hierarchy, semantic order summary, and native radio group', () => {
      (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false, error: null });

      render(<CheckoutPage />);

      expect(screen.getByRole('heading', { level: 1, name: 'Checkout' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Order Summary' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Payment Method' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Payment Method' })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(screen.getByRole('region', { name: 'Order Summary' })).toBeInTheDocument();
      expect(screen.getAllByText('100.00 US dollars')).toHaveLength(2);
    });

    it('exposes understandable amounts and hides decorative security icons', () => {
      const previewWithAdjustments = {
        ...mockCartPreviewData,
        subtotal: 120,
        discountTotal: 25,
        taxAmount: 5,
        totalAmount: 100,
      };
      (useCheckoutPreview as any).mockReturnValue({ data: previewWithAdjustments, isLoading: false, error: null });

      render(<CheckoutPage />);

      expect(screen.getByText('120.00 US dollars')).toHaveClass('sr-only');
      expect(screen.getByText('Minus 25.00 US dollars')).toHaveClass('sr-only');
      expect(screen.getByText('5.00 US dollars')).toHaveClass('sr-only');
      expect(screen.getByText('SSL encrypted').previousElementSibling).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('30-day guarantee').previousElementSibling).toHaveAttribute('aria-hidden', 'true');
    });

    it('supports arrow-key payment selection through native radios', async () => {
      const user = userEvent.setup();
      (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false, error: null });
      render(<CheckoutPage />);

      const paypal = screen.getByRole('radio', { name: /PayPal/i });
      paypal.focus();
      await user.keyboard('{ArrowDown}');

      expect(mockSetPaymentMethod).toHaveBeenCalledWith(PaymentMethod.SEPAY);
    });

    it('focuses an accessible validation summary when no payment method is selected', async () => {
      const user = userEvent.setup();
      (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false, error: null });
      render(<CheckoutPage />);

      await user.click(screen.getByRole('button', { name: /Complete Order/i }));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Select a payment method');
      expect(screen.getByRole('heading', { name: 'Unable to place order' })).toHaveFocus();
      expect(mockCheckoutMutate).not.toHaveBeenCalled();
    });

    it('announces and focuses the external-provider status before redirecting', async () => {
      const user = userEvent.setup();
      (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false, error: null });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });
      mockCheckoutMutate.mockResolvedValue({
        success: false,
        requiresRedirect: true,
        redirectUrl: 'https://payments.example.test/checkout',
      });

      const { unmount } = render(<CheckoutPage />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('');
      expect(status).toHaveAttribute('aria-live', 'assertive');

      await user.click(screen.getByRole('button', { name: /Complete Order/i }));

      await waitFor(() => {
        expect(status).toHaveTextContent('You are now leaving EduMind');
        expect(status).toHaveFocus();
      });
      unmount();
    });

    it.each(['abc', '-1'])('B3: rejects invalid direct-checkout courseId=%s and focuses the error', async (courseId) => {
      mockSearchParams.set('courseId', courseId);
      render(<CheckoutPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Checkout Error' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByRole('alert')).toHaveTextContent('valid course');
      expect(screen.getByRole('button', { name: 'Return to Courses' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /(?:Place|Complete) Order/i })).not.toBeInTheDocument();
      expect(useDirectCheckoutPreview).toHaveBeenCalledWith(0, false);
    });

    it('B3: shows and focuses Checkout Error when the course is unavailable', async () => {
      mockSearchParams.set('courseId', '999999');
      (useDirectCheckoutPreview as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Course not found'),
      });
      render(<CheckoutPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Checkout Error' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByRole('button', { name: 'Return to Courses' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /(?:Place|Complete) Order/i })).not.toBeInTheDocument();
      expect(useDirectCheckoutPreview).toHaveBeenCalledWith(999999, true);
    });

    it('guards against Enter and Space submitting the same order twice', async () => {
      const user = userEvent.setup();
      let resolveCheckout: (value: any) => void = () => undefined;
      mockCheckoutMutate.mockReturnValue(new Promise((resolve) => { resolveCheckout = resolve; }));
      (useCheckoutPreview as any).mockReturnValue({ data: mockCartPreviewData, isLoading: false, error: null });
      (useCheckoutStore as any).mockReturnValue({
        selectedPaymentMethod: PaymentMethod.PAYPAL,
        setPaymentMethod: mockSetPaymentMethod,
        setStep: mockSetStep,
        setResult: mockSetResult,
        reset: mockResetCheckout,
      });
      render(<CheckoutPage />);

      const submit = screen.getByRole('button', { name: /Complete Order/i });
      submit.focus();
      await user.keyboard('{Enter} ');
      expect(mockCheckoutMutate).toHaveBeenCalledTimes(1);

      resolveCheckout({ success: true, orderNumber: 'ORD-ONCE' });
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=ORD-ONCE`));
    });
  });
});
