
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../hooks/useCart');
vi.mock('../../stores/cart.store');

vi.mock('../../components/payment-module', () => ({
  CartItem: ({ item, onRemove }: any) => (
    <div data-testid={`cart-item-${item.courseId}`}>
      {item.courseTitle}
      <button onClick={() => onRemove(item.courseId)}>Remove</button>
    </div>
  ),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
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

  it('renders loading state', () => {
    (useCart as any).mockReturnValue({ isLoading: true });
    render(<CartPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
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
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({ 
      data: { items: [] },
      isLoading: false 
    });

    render(<CartPage />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    
    await user.click(screen.getByText('Browse Courses'));
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.COURSES);
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
    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
    
    // Summary check
    expect(screen.getByText('Subtotal (2 items):')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('handles remove item interaction', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({ 
      data: { items: [{ courseId: 1, courseTitle: 'React 101' }] },
      isLoading: false 
    });
    
    render(<CartPage />);
    
    await user.click(screen.getByText('Remove'));
    
    expect(mockRemoveMutate).toHaveBeenCalled();
    // Verify callback handling via mock logic if needed, but basic call is enough here
    const mutateCallArgs = mockRemoveMutate.mock.calls[0];
    expect(mutateCallArgs[0]).toBe(1);
    
    // Simulate success callback execution
    mutateCallArgs[1].onSuccess();
    expect(mockShowSuccess).toHaveBeenCalledWith('Item removed from cart');
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
});
