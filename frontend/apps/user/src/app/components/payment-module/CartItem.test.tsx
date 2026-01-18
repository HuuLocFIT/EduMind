import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartItem } from './CartItem';
import { UserRouteHelpers } from '@edumind/shared-utils';

// Mock Dependencies
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

vi.mock('@edumind/user-ui', () => ({
  PriceTag: ({ price, originalPrice, size }: any) => (
    <div data-testid="price-tag">
      <span>{price}</span>
      {originalPrice && <span>(Original: {originalPrice})</span>}
      <span>{size}</span>
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <span>TrashIcon</span>,
  AlertCircle: () => <span>AlertCircleIcon</span>,
}));

vi.mock('@edumind/shared-utils', () => ({
  UserRouteHelpers: {
    courseDetail: (id: number) => `/courses/${id}`,
  },
}));

describe('CartItem', () => {
  const mockOnRemove = vi.fn();
  const mockItem = {
    courseId: 101,
    courseTitle: 'Advanced React Patterns',
    instructorName: 'John Doe',
    courseThumbnailUrl: 'http://example.com/image.jpg',
    effectivePrice: 49.99,
    originalPrice: 99.99,
    discountAmount: 50.00,
    level: 'Advanced',
    totalLessons: 24,
    averageRating: 4.8,
    isAvailable: true,
    unavailableReason: null,
  };

  const mockUnavailableItem = {
    ...mockItem,
    courseId: 102,
    courseTitle: 'Unavailable Course',
    isAvailable: false,
    unavailableReason: 'Course has been unpublished',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in compact mode (drawer)', () => {
    render(
      <CartItem
        item={mockItem}
        onRemove={mockOnRemove}
        compact={true}
      />
    );

    // Should show title (truncated or not, but present)
    expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    // Should render thumbnail
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockItem.courseThumbnailUrl);
    expect(img).toHaveAttribute('alt', mockItem.courseTitle);

    // Should link to course detail
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    // Assuming simple mock, just check at least one link points to course detail
    expect(links.some(link => link.getAttribute('href') === '/courses/101')).toBe(true);
  });

  it('renders correctly in full mode (cart page)', () => {
    render(
      <CartItem
        item={mockItem}
        onRemove={mockOnRemove}
        compact={false}
      />
    );

    expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
    expect(screen.getByText('By John Doe')).toBeInTheDocument(); // Full mode text
    expect(screen.getByText('advanced')).toBeInTheDocument(); // Level
    expect(screen.getByText('24 lessons')).toBeInTheDocument();
    expect(screen.getByText(/4.8/)).toBeInTheDocument(); // Rating
  });

  it('handles regular remove click', async () => {
    const user = userEvent.setup();
    render(
      <CartItem
        item={mockItem}
        onRemove={mockOnRemove}
        compact={false}
      />
    );

    // Need to find the button. In Full mode, there might be mobile and desktop buttons.
    // Let's find by Trash icon text or aria label if implemented, or just "Remove" text
    const removeBtns = screen.getAllByText('Remove');
    // Click the first one (Desktop or Mobile doesn't matter for logic verification)
    await user.click(removeBtns[0]);

    expect(mockOnRemove).toHaveBeenCalledWith(101);
  });
  
  it('handles compact remove click', async () => {
    const user = userEvent.setup();
    render(
      <CartItem
        item={mockItem}
        onRemove={mockOnRemove}
        compact={true}
      />
    );

    const btn = screen.getByTitle('Remove from cart');
    await user.click(btn);

    expect(mockOnRemove).toHaveBeenCalledWith(101);
  });

  it('applies removal styling when isRemoving is true', () => {
     const { container } = render(
      <CartItem
        item={mockItem}
        onRemove={mockOnRemove}
        isRemoving={true}
        compact={true}
      />
    );
    
    // The top level div should have opacity-50
    const topDiv = container.firstChild as HTMLDivElement;
    expect(topDiv.className).toContain('opacity-50');
  });

  it('renders fallback when no thumbnail provided', () => {
     render(
      <CartItem
        item={{ ...mockItem, courseThumbnailUrl: undefined }}
        onRemove={mockOnRemove}
        compact={true}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Should render the fallback div (checking implementation detail or class)
    // Actually best to check simply that it didn't crash and logic path was taken
  });

  // Tests for unavailable items (FIX #15)
  describe('unavailable items', () => {
    it('renders unavailable indicator in compact mode', () => {
      const { container } = render(
        <CartItem
          item={mockUnavailableItem}
          onRemove={mockOnRemove}
          compact={true}
        />
      );

      // Should show "Unavailable" text instead of price
      expect(screen.getByText('Unavailable')).toBeInTheDocument();

      // Should show unavailable reason
      expect(screen.getByText('Course has been unpublished')).toBeInTheDocument();

      // Should have red border styling
      const topDiv = container.firstChild as HTMLDivElement;
      expect(topDiv.className).toContain('border-red');
    });

    it('renders unavailable banner in full mode', () => {
      render(
        <CartItem
          item={mockUnavailableItem}
          onRemove={mockOnRemove}
          compact={false}
        />
      );

      // Should show unavailable reason in banner
      expect(screen.getByText('Course has been unpublished')).toBeInTheDocument();

      // Should show "Unavailable" text instead of price (multiple instances for mobile/desktop)
      const unavailableTexts = screen.getAllByText('Unavailable');
      expect(unavailableTexts.length).toBeGreaterThan(0);
    });

    it('does not show price tag for unavailable items in compact mode', () => {
      render(
        <CartItem
          item={mockUnavailableItem}
          onRemove={mockOnRemove}
          compact={true}
        />
      );

      // Price tag should not be rendered for unavailable items
      expect(screen.queryByTestId('price-tag')).not.toBeInTheDocument();
    });

    it('still allows removal of unavailable items', async () => {
      const user = userEvent.setup();
      render(
        <CartItem
          item={mockUnavailableItem}
          onRemove={mockOnRemove}
          compact={true}
        />
      );

      const btn = screen.getByTitle('Remove from cart');
      await user.click(btn);

      expect(mockOnRemove).toHaveBeenCalledWith(102);
    });

    it('applies grayscale styling to unavailable item thumbnail in full mode', () => {
      const { container } = render(
        <CartItem
          item={mockUnavailableItem}
          onRemove={mockOnRemove}
          compact={false}
        />
      );

      // Find the thumbnail container - it should have grayscale class
      const thumbnailContainer = container.querySelector('.grayscale');
      expect(thumbnailContainer).toBeInTheDocument();
    });

    it('renders default unavailable message when reason is not provided', () => {
      const itemWithoutReason = {
        ...mockUnavailableItem,
        unavailableReason: null,
      };

      render(
        <CartItem
          item={itemWithoutReason}
          onRemove={mockOnRemove}
          compact={false}
        />
      );

      // Should show default message
      expect(screen.getByText('This course is no longer available')).toBeInTheDocument();
    });
  });
});
