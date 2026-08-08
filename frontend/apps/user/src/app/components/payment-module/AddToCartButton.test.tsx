import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCartButton } from './AddToCartButton';
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';
import { useAddToCart, useIsInCart } from '../../hooks/useCart';
import { useToast } from '@edumind/user-ui';

// Mock dependencies
const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock UI components
vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, variant, className, leftIcon, isLoading, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`${className} variant-${variant}`}
      disabled={isLoading || disabled}
      data-testid="add-to-cart-btn"
      {...props}
    >
      {isLoading ? 'Loading...' : children}
      {leftIcon && <span data-testid="left-icon">ICON</span>}
    </button>
  ),
  useToast: vi.fn(),
}));

// Mock Stores and Hooks
vi.mock('../../stores/auth.store');
vi.mock('../../stores/cart.store');
vi.mock('../../hooks/useCart');

// Mock shared utils
vi.mock('@edumind/shared-utils', () => ({
  USER_ROUTES: {
    LOGIN: '/login',
    CART: '/cart',
  },
  API_URL: 'http://localhost:3000/api',
}));

describe('AddToCartButton', () => {
  // Mock Functions
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockAddToCartMutate = vi.fn();
  
  const mockStartAddingItem = vi.fn();
  const mockFinishAddingItem = vi.fn();
  const mockIsItemInCart = vi.fn();
  const mockIsItemPending = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset inner mocks
    mockIsItemInCart.mockReturnValue(false);
    mockIsItemPending.mockReturnValue(false);
    mockAddToCartMutate.mockReset(); // Reset specific mutation mock

    // Setup default mock returns
    (useToast as any).mockReturnValue({
      success: mockShowSuccess,
      error: mockShowError,
    });

    (useAddToCart as any).mockReturnValue({
      mutateAsync: mockAddToCartMutate,
      isPending: false,
    });

    (useIsInCart as any).mockReturnValue({
      data: false,
      isLoading: false,
    });

    (useAuthStore as unknown as any).mockReturnValue({
      isAuthenticated: true,
    });

    (useCartStore as unknown as any).mockReturnValue({
      startAddingItem: mockStartAddingItem,
      finishAddingItem: mockFinishAddingItem,
      isItemInCart: mockIsItemInCart,
      isItemPending: mockIsItemPending,
    });
  });

  it('renders correctly when not enrolled and not in cart', () => {
    render(<AddToCartButton courseId={1} />);
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    expect(screen.getByTestId('add-to-cart-btn')).not.toBeDisabled();
  });

  it('redirects to login if not authenticated', async () => {
    const user = userEvent.setup();
    (useAuthStore as unknown as any).mockReturnValue({ isAuthenticated: false });
    
    render(<AddToCartButton courseId={1} />);
    await user.click(screen.getByText('Add to Cart'));

    expect(mockShowError).toHaveBeenCalledWith('Please login to add courses to cart');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockAddToCartMutate).not.toHaveBeenCalled();
  });

  it('navigates to cart if item is already in cart (server)', async () => {
    const user = userEvent.setup();
    (useIsInCart as any).mockReturnValue({ data: true, isLoading: false });
    
    render(<AddToCartButton courseId={1} />);
    
    const btn = screen.getByTestId('add-to-cart-btn');
    expect(btn).toHaveTextContent('In Cart');
    expect(btn).toHaveClass('variant-outline');
    
    await user.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/cart');
    expect(mockAddToCartMutate).not.toHaveBeenCalled();
  });

  it('navigates to cart if item is already in cart (local)', async () => {
    const user = userEvent.setup();
    mockIsItemInCart.mockReturnValue(true);
    
    render(<AddToCartButton courseId={1} />);
    
    const btn = screen.getByTestId('add-to-cart-btn');
    expect(btn).toHaveTextContent('In Cart');
    
    await user.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/cart');
  });

  it('returns null if already enrolled', () => {
    const { container } = render(<AddToCartButton courseId={1} isEnrolled={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles add to cart success flow', async () => {
    const user = userEvent.setup();
    mockAddToCartMutate.mockResolvedValue({});

    render(<AddToCartButton courseId={1} />);
    await user.click(screen.getByText('Add to Cart'));

    expect(mockStartAddingItem).toHaveBeenCalledWith(1);
    expect(mockAddToCartMutate).toHaveBeenCalledWith(1);
    
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledTimes(1);
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Course added to cart. You can now view your cart or continue browsing.'
      );
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    
    expect(mockFinishAddingItem).toHaveBeenCalledWith(1);
  });

  it('handles add to cart error flow', async () => {
    const user = userEvent.setup();
    const error = new Error('Network error');
    mockAddToCartMutate.mockRejectedValue(error);

    render(<AddToCartButton courseId={1} />);
    await user.click(screen.getByText('Add to Cart'));

    expect(mockStartAddingItem).toHaveBeenCalledWith(1);
    
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Network error');
    });

    expect(mockFinishAddingItem).toHaveBeenCalledWith(1);
  });

  it('shows loading state when mutation is pending', () => {
    (useAddToCart as any).mockReturnValue({
      mutateAsync: mockAddToCartMutate,
      isPending: true,
    });

    render(<AddToCartButton courseId={1} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('add-to-cart-btn')).toBeDisabled();
    expect(screen.getByTestId('add-to-cart-btn')).toHaveAttribute('aria-busy', 'true');
  });
  
  it('shows loading state when local item is pending', () => {
    mockIsItemPending.mockReturnValue(true);

    render(<AddToCartButton courseId={1} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('add-to-cart-btn')).toBeDisabled();
  });
});
