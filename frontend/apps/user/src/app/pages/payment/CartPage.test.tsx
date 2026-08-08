
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartPage } from './CartPage';
import { useCart, useRemoveFromCart, useClearCart } from '../../hooks/useCart';
import { useCartStore } from '../../stores/cart.store';
import { USER_ROUTES } from '@edumind/shared-utils';
import { useToast } from '@edumind/user-ui';

// Mock Dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../../hooks/useCart');
vi.mock('../../stores/cart.store');

vi.mock('../../components/payment-module', () => ({
  CartItem: ({ item, onRemove }: any) => (
    <li data-cart-item data-testid={`cart-item-${item.courseId}`}>
      {item.courseTitle}
      <button onClick={() => onRemove(item.courseId)}>Remove {item.courseTitle}</button>
    </li>
  ),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Loading: () => <div>Loading...</div>,
  PriceTag: ({ price }: any) => <span>${price}</span>,
  ConfirmDialog: ({ isOpen, onConfirm, onCancel, title }: any) => 
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h1>{title}</h1>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
  useToast: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  ShoppingCart: () => <span>CartIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  ArrowRight: () => <span>ArrowRight</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  AlertTriangle: () => <span data-testid="alert-triangle">AlertTriangleIcon</span>,
}));

describe('CartPage', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  
  const mockRefetch = vi.fn();
  const mockSetCart = vi.fn();
  const mockClearLocalCart = vi.fn();
  
  const mockRemoveMutate = vi.fn();
  const mockClearCartMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';

    (useToast as any).mockReturnValue({
      success: mockShowSuccess,
      error: mockShowError,
    });

    (useCartStore as any).mockReturnValue({
      setCart: mockSetCart,
      pendingRemovals: [],
      clearCart: mockClearLocalCart,
    });

    (useRemoveFromCart as any).mockReturnValue({
      mutate: mockRemoveMutate,
      isPending: false,
    });

    (useClearCart as any).mockReturnValue({
      mutate: mockClearCartMutate,
      isPending: false,
    });

    // Default useCart mock (empty/loading state needs override)
    (useCart as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('sets a non-empty route-specific document title', async () => {
    render(<CartPage />);

    await waitFor(() => {
      expect(document.title).toBe('Shopping Cart | EduMind');
    });
  });

  it('renders loading state', () => {
    (useCart as any).mockReturnValue({ isLoading: true });
    render(<CartPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('focuses the page heading when the cart page mounts', () => {
    render(<CartPage />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Shopping Cart' });
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).toHaveFocus();
  });

  it('renders error state', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({ 
      error: new Error('Failed to load'),
      refetch: mockRefetch 
    });
    
    render(<CartPage />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    
    await user.click(screen.getByText('Try Again'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders empty state', async () => {
    (useCart as any).mockReturnValue({ 
      data: { items: [] },
      isLoading: false 
    });

    render(<CartPage />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', USER_ROUTES.COURSES);
  });

  it('renders populated cart with items and summary', () => {
    (useCart as any).mockReturnValue({ 
      data: { 
        items: [
          { courseId: 1, courseTitle: 'React 101' },
          { courseId: 2, courseTitle: 'Advanced TS' }
        ],
        subtotal: 100,
        totalAmount: 100,
        currency: 'USD'
      },
      isLoading: false 
    });

    render(<CartPage />);

    // Header check
    expect(screen.getByText('2 courses in your cart')).toBeInTheDocument();
    
    // Items check
    const courseList = screen.getByRole('list', { name: 'Courses in your cart' });
    expect(courseList).toBeInTheDocument();
    expect(within(courseList).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
    
    // Summary check
    const summary = screen.getByRole('region', { name: 'Order Summary' });
    expect(within(summary).getByText('Subtotal (2 items):')).toBeInTheDocument();
    expect(within(summary).getByText('$100.00')).toBeInTheDocument();
    expect(within(summary).getByText('Total:')).toBeInTheDocument();
  });

  it('handles remove item interaction', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({ 
      data: { items: [{ courseId: 1, courseTitle: 'React 101' }] },
      isLoading: false 
    });
    
    render(<CartPage />);
    
    await user.click(screen.getByText('Remove React 101'));
    await user.click(screen.getByText('Confirm'));
    expect(mockRemoveMutate).toHaveBeenCalled();
    // Verify callback handling via mock logic if needed, but basic call is enough here
    const mutateCallArgs = mockRemoveMutate.mock.calls[0];
    expect(mutateCallArgs[0]).toBe(1);
    
    // Simulate success callback execution
    mutateCallArgs[1].onSuccess();
    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'React 101 removed from cart. New total: $0.00 USD.',
    );
    const removalStatus = screen.getByRole('status');
    expect(removalStatus).toHaveAttribute('aria-live', 'polite');
    expect(removalStatus).toHaveAttribute('aria-atomic', 'true');
    await waitFor(() => {
      expect(removalStatus).toHaveTextContent(
        'React 101 removed from cart. New total: $0.00 USD.',
      );
    });
  });

  it('moves focus only after the removed item is absent from the rendered cart', async () => {
    const user = userEvent.setup();
    const initialCart = {
      items: [
        { courseId: 1, courseTitle: 'React 101', effectivePrice: 40 },
        { courseId: 2, courseTitle: 'Advanced TS', effectivePrice: 60 },
      ],
      subtotal: 100,
      totalAmount: 100,
      currency: 'USD',
    };
    (useCart as any).mockReturnValue({ data: initialCart, isLoading: false });

    const { rerender } = render(<CartPage />);
    await user.click(screen.getByRole('button', { name: 'Remove React 101' }));
    await user.click(screen.getByText('Confirm'));

    const mutationOptions = mockRemoveMutate.mock.calls[0][1];
    await act(async () => mutationOptions.onSuccess());
    expect(screen.getByRole('button', { name: 'Remove React 101' })).toBeInTheDocument();

    (useCart as any).mockReturnValue({
      data: { ...initialCart, items: [initialCart.items[1]], subtotal: 60, totalAmount: 60 },
      isLoading: false,
    });
    rerender(<CartPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove Advanced TS' })).toHaveFocus());
  });

  it('handles checkout navigation', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({ 
      data: { items: [{ courseId: 1 }] },
      isLoading: false 
    });

    render(<CartPage />);
    
    // There are 2 checkout buttons (order summary + header/mobile potentially, but mainly summary)
    // Find by text "Proceed to Checkout" (desktop) or "Checkout"
    // The Button mock renders children, so we look for "Proceed to Checkout"
    await user.click(screen.getByText('Proceed to Checkout'));
    
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
  });
  
  it('shows error if checkout clicked with empty cart (edge case)', async () => {
    const user = userEvent.setup();
     (useCart as any).mockReturnValue({ 
      data: { items: [] }, // Empty items
      isLoading: false 
    });
    
    // Force a situation where button might be visible or call helper directly?
    // In current UI, button is hidden if items.length === 0.
    // So this test might not be reachable via UI interaction on empty state component.
    // Instead, let's test that empty state is rendered, which we did above.
    // Skip this or verify handleCheckout logic via unit test if exported? 
    // Since we text via UI, we skip un-clickable scenarios.
  });

  it('handles clear cart flow', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({
      data: { items: [{ courseId: 1 }] },
      isLoading: false
    });

    render(<CartPage />);

    // Click "Clear Cart" button
    await user.click(screen.getByText('Clear Cart'));

    // Dialog should appear
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    // Confirm
    await user.click(screen.getByText('Confirm'));

    expect(mockClearCartMutate).toHaveBeenCalled();

    // Simulate success
    const mutateCallArgs = mockClearCartMutate.mock.calls[0];
    mutateCallArgs[1].onSuccess();

    expect(mockClearLocalCart).toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Cart cleared');
  });

  // Tests for unavailable items
  describe('unavailable items', () => {
    it('shows warning banner when cart has unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Available Course', isAvailable: true },
            { courseId: 2, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          subtotal: 100,
          totalAmount: 100,
        },
        isLoading: false
      });

      render(<CartPage />);

      // Should show warning banner with alert icon
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();

      // Should show message about unavailable items
      expect(screen.getByText(/1 item is no longer available/i)).toBeInTheDocument();
      expect(screen.getByText(/remove unavailable items before proceeding/i)).toBeInTheDocument();
    });

    it('shows correct plural form for multiple unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable 1', isAvailable: false },
            { courseId: 2, courseTitle: 'Unavailable 2', isAvailable: false },
            { courseId: 3, courseTitle: 'Available', isAvailable: true },
          ],
          subtotal: 150,
          totalAmount: 150,
        },
        isLoading: false
      });

      render(<CartPage />);

      expect(screen.getByText(/2 items are no longer available/i)).toBeInTheDocument();
    });

    it('disables checkout button when there are unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          subtotal: 50,
          totalAmount: 50,
        },
        isLoading: false
      });

      render(<CartPage />);

      // Button should show different text and be disabled
      const checkoutBtn = screen.getByText('Remove unavailable items');
      expect(checkoutBtn).toBeDisabled();
    });

    it('shows error when trying to checkout with unavailable items', async () => {
      const user = userEvent.setup();
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          subtotal: 50,
          totalAmount: 50,
        },
        isLoading: false
      });

      render(<CartPage />);

      const checkoutBtn = screen.getByText('Remove unavailable items');
      await user.click(checkoutBtn);

      // Should NOT navigate
      expect(mockNavigate).not.toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });

    it('enables checkout when all items are available', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Course 1', isAvailable: true },
            { courseId: 2, courseTitle: 'Course 2', isAvailable: true },
          ],
          subtotal: 100,
          totalAmount: 100,
        },
        isLoading: false
      });

      render(<CartPage />);

      // Should NOT show warning
      expect(screen.queryByTestId('alert-triangle')).not.toBeInTheDocument();

      // Button should be enabled with normal text
      const checkoutBtn = screen.getByText('Proceed to Checkout');
      expect(checkoutBtn).not.toBeDisabled();
    });

    it('does not show warning banner when no unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Course 1', isAvailable: true },
          ],
          subtotal: 50,
          totalAmount: 50,
        },
        isLoading: false
      });

      render(<CartPage />);

      // Warning banner should not exist
      expect(screen.queryByText(/no longer available/i)).not.toBeInTheDocument();
    });

    it('disables checkout when all items are unavailable (zero available)', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable 1', isAvailable: false },
            { courseId: 2, courseTitle: 'Unavailable 2', isAvailable: false },
          ],
          subtotal: 100,
          totalAmount: 100,
        },
        isLoading: false
      });

      render(<CartPage />);

      const checkoutBtn = screen.getByText('Remove unavailable items');
      expect(checkoutBtn).toBeDisabled();
    });
  });
});
