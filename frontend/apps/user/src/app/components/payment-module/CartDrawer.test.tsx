import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from './CartDrawer';
import { DIALOG_EXIT_MS, FOCUS_SETTLE_MS } from '../../hooks/useRemovalAnnouncement';
import { useCart, useRemoveFromCart } from '../../hooks/useCart';
import { useCartStore } from '../../stores/cart.store';
import { USER_ROUTES } from '@edumind/shared-utils';

// Mock Dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../../hooks/useCart');
vi.mock('../../stores/cart.store');

// Mock child components to isolate Drawer logic
vi.mock('./CartItem', () => ({
  CartItem: ({ item, onRemove }: any) => (
    <div data-cart-item data-testid={`cart-item-${item.courseId}`}>
      {item.courseTitle}
      <button onClick={() => onRemove(item.courseId)}>Remove {item.courseTitle}</button>
    </div>
  ),
}));

const mockShowError = vi.fn();
const mockShowToast = vi.fn();
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, rightIcon, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children} {rightIcon && <span>ICON</span>}
    </button>
  ),
  Loading: () => <div>Loading...</div>,
  useToast: () => ({ error: mockShowError, showToast: mockShowToast }),
  ConfirmDialog: ({ isOpen, onConfirm, title }: any) => isOpen ? <div role="dialog" aria-label={title}><button onClick={onConfirm}>Confirm removal</button></div> : null,
}));

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  ShoppingCart: () => <span>CartIcon</span>,
  ArrowRight: () => <span>ArrowIcon</span>,
  AlertTriangle: () => <span data-testid="alert-triangle">AlertTriangleIcon</span>,
}));

describe('CartDrawer', () => {
  const mockOnClose = vi.fn();
  const mockSetCart = vi.fn();
  const mockRemoveMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockShowError.mockClear();

    (useCartStore as any).mockReturnValue({
      setCart: mockSetCart,
      pendingRemovals: [],
    });

    (useRemoveFromCart as any).mockReturnValue({
      mutate: mockRemoveMutate,
    });

    (useCart as any).mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  it('does not render when closed', () => {
    const { container } = render(<CartDrawer {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when open', () => {
    render(<CartDrawer {...defaultProps} />);
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
  });

  it('handles empty state correctly', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({
      data: { items: [], totalAmount: 0 },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    
    // Test Browse Courses button
    await user.click(screen.getByText('Browse Courses'));
    expect(mockOnClose).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', USER_ROUTES.COURSES);
  });

  it('renders cart items and total', () => {
    (useCart as any).mockReturnValue({
      data: {
        items: [
          { courseId: 1, courseTitle: 'React Course', effectivePrice: 100 },
          { courseId: 2, courseTitle: 'Java Course', effectivePrice: 50 },
        ],
        totalAmount: 150,
        currency: 'USD',
      },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
    expect(screen.getByText(/150.00 USD/)).toBeInTheDocument();
    const accessibleTotal = screen.getByLabelText('Total 150.00 US dollars');
    expect(accessibleTotal).toHaveAttribute('role', 'text');
    expect(screen.getByText('Total:')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(/150.00 USD/)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('dialog', { name: 'Shopping Cart, 2 items' })).toBeInTheDocument();
    expect(screen.getByText('2')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses singular item wording in the dialog name', () => {
    (useCart as any).mockReturnValue({
      data: {
        items: [{ courseId: 1, courseTitle: 'React Course', effectivePrice: 100 }],
        totalAmount: 100,
        currency: 'USD',
      },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    expect(screen.getByRole('dialog', { name: 'Shopping Cart, 1 item' })).toBeInTheDocument();
  });

  it('handles item removal', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({
      data: {
        items: [{ courseId: 1, courseTitle: 'React Course' }],
        totalAmount: 100,
      },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    const removeBtn = screen.getByText('Remove React Course');
    await user.click(removeBtn);
    await user.click(screen.getByText('Confirm removal'));

    expect(mockRemoveMutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('announces the removal only after focus has already moved', () => {
    // Same VoiceOver constraint as CartPage: a live-region update that lands in
    // the same tick as a focus move is discarded by WebKit.
    vi.useFakeTimers();
    try {
      const items = [
        { courseId: 1, courseTitle: 'React Course', effectivePrice: 100 },
        { courseId: 2, courseTitle: 'Java Course', effectivePrice: 50 },
      ];
      (useCart as any).mockReturnValue({
        data: { items, totalAmount: 150, currency: 'USD' },
        isLoading: false,
      });

      const { rerender } = render(<CartDrawer {...defaultProps} />);
      fireEvent.click(screen.getByText('Remove React Course'));
      fireEvent.click(screen.getByText('Confirm removal'));

      act(() => mockRemoveMutate.mock.calls[0][1].onSuccess());
      expect(mockShowToast).toHaveBeenCalledWith(
        'React Course removed from cart. New total: $50.00 USD.',
        { variant: 'success', silent: true },
      );

      (useCart as any).mockReturnValue({
        data: { items: [items[1]], totalAmount: 50, currency: 'USD' },
        isLoading: false,
      });
      rerender(<CartDrawer {...defaultProps} />);

      const removalStatus = screen.getByRole('status');
      const successor = screen.getByText('Remove Java Course');

      act(() => vi.advanceTimersByTime(DIALOG_EXIT_MS));
      expect(successor).toHaveFocus();
      expect(removalStatus).toHaveTextContent('');

      act(() => vi.advanceTimersByTime(FOCUS_SETTLE_MS));
      expect(removalStatus).toHaveTextContent(
        'React Course removed from cart. New total: $50.00 USD.',
      );
      expect(successor).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles checkout navigation', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({
      data: {
        items: [{ courseId: 1, courseTitle: 'React Course' }],
        totalAmount: 100,
      },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    await user.click(screen.getByText('Checkout'));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
  });

  it('handles view cart navigation', async () => {
    const user = userEvent.setup();
    (useCart as any).mockReturnValue({
      data: {
        items: [{ courseId: 1, courseTitle: 'React Course' }],
        totalAmount: 100,
      },
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    await user.click(screen.getByText('View Cart'));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.CART);
  });

  it('syncs data with store on load', () => {
    const mockData = {
      items: [{ courseId: 1 }],
      totalAmount: 100,
      currency: 'EUR',
    };
    
    (useCart as any).mockReturnValue({
      data: mockData,
      isLoading: false,
    });

    render(<CartDrawer {...defaultProps} />);

    expect(mockSetCart).toHaveBeenCalledWith(mockData.items, mockData.totalAmount, mockData.currency);
  });

  it('locks body scroll when open', () => {
    render(<CartDrawer {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed (unmount)', () => {
    const { unmount } = render(<CartDrawer {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden'); // Initially hidden
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
  
  it('restores body scroll when isOpen becomes false', () => {
    const { rerender } = render(<CartDrawer {...defaultProps} />);
    rerender(<CartDrawer {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  // Tests for unavailable items
  describe('unavailable items', () => {
    it('shows warning when cart has unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Available Course', isAvailable: true },
            { courseId: 2, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          totalAmount: 100,
          currency: 'USD',
        },
        isLoading: false,
      });

      render(<CartDrawer {...defaultProps} />);

      // Should show alert triangle icon
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();

      // Should show unavailable count
      expect(screen.getByText(/1 item unavailable/i)).toBeInTheDocument();
    });

    it('shows correct count for multiple unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable Course 1', isAvailable: false },
            { courseId: 2, courseTitle: 'Unavailable Course 2', isAvailable: false },
            { courseId: 3, courseTitle: 'Available Course', isAvailable: true },
          ],
          totalAmount: 150,
          currency: 'USD',
        },
        isLoading: false,
      });

      render(<CartDrawer {...defaultProps} />);

      // Should show count of 2
      expect(screen.getByText(/2 items unavailable/i)).toBeInTheDocument();
    });

    it('disables checkout button when there are unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          totalAmount: 100,
          currency: 'USD',
        },
        isLoading: false,
      });

      render(<CartDrawer {...defaultProps} />);

      // Checkout button should show different text
      expect(screen.getByText('Remove unavailable items')).toBeInTheDocument();
    });

    it('checkout button is disabled when there are unavailable items', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Unavailable Course', isAvailable: false },
          ],
          totalAmount: 100,
          currency: 'USD',
        },
        isLoading: false,
      });

      render(<CartDrawer {...defaultProps} />);

      // Checkout button should be disabled
      const checkoutBtn = screen.getByText('Remove unavailable items');
      expect(checkoutBtn).toBeDisabled();

      // Navigation should not have been called
      expect(mockNavigate).not.toHaveBeenCalledWith(USER_ROUTES.CHECKOUT);
    });

    it('does not show warning when all items are available', () => {
      (useCart as any).mockReturnValue({
        data: {
          items: [
            { courseId: 1, courseTitle: 'Course 1', isAvailable: true },
            { courseId: 2, courseTitle: 'Course 2', isAvailable: true },
          ],
          totalAmount: 100,
          currency: 'USD',
        },
        isLoading: false,
      });

      render(<CartDrawer {...defaultProps} />);

      // Should NOT show alert triangle
      expect(screen.queryByTestId('alert-triangle')).not.toBeInTheDocument();

      // Checkout button should show normal text
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });
  });
});
