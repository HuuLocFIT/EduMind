import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from './CartDrawer';
import { useCart, useRemoveFromCart } from '../../hooks/useCart';
import { useCartStore } from '../../stores/cart.store';
import { USER_ROUTES } from '@edumind/shared-utils';

// Mock Dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../hooks/useCart');
vi.mock('../../stores/cart.store');

// Mock child components to isolate Drawer logic
vi.mock('./CartItem', () => ({
  CartItem: ({ item, onRemove }: any) => (
    <div data-testid={`cart-item-${item.courseId}`}>
      {item.courseTitle}
      <button onClick={() => onRemove(item.courseId)}>Remove</button>
    </div>
  ),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, rightIcon }: any) => (
    <button onClick={onClick}>
      {children} {rightIcon && <span>ICON</span>}
    </button>
  ),
  Loading: () => <div>Loading...</div>,
}));

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  ShoppingCart: () => <span>CartIcon</span>,
  ArrowRight: () => <span>ArrowIcon</span>,
}));

describe('CartDrawer', () => {
  const mockOnClose = vi.fn();
  const mockSetCart = vi.fn();
  const mockRemoveMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.COURSES);
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

    const removeBtn = screen.getByText('Remove');
    await user.click(removeBtn);

    expect(mockRemoveMutate).toHaveBeenCalledWith(1);
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
});
