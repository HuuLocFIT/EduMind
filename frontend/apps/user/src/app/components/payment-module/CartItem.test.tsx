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
  CloudinaryImage: ({ src, alt, className }: any) =>
    src ? <img src={src} alt={alt} className={className} /> : null,
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
    courseSlug: '101',
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
    const img = document.querySelector('img') as HTMLImageElement;
    expect(img).toHaveAttribute('src', mockItem.courseThumbnailUrl);
    expect(img).toHaveAttribute('alt', '');

    // One stretched link makes the whole item clickable without adding duplicate tab stops.
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/courses/101');
    expect(links[0]).toHaveClass('after:absolute', 'after:inset-0');
    expect(links[0]).toHaveClass('focus-visible:after:outline-blue-500');
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
    expect(screen.getByText('Advanced')).toBeInTheDocument(); // Level
    expect(screen.getByText('24 lessons')).toBeInTheDocument();
    expect(screen.getByText(/4.8/)).toBeInTheDocument(); // Rating

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveClass('after:absolute', 'after:inset-0');
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
    const removeBtn = screen.getByRole('button', { name: 'Remove Advanced React Patterns from cart' });
    expect(removeBtn).toHaveClass('min-h-11', 'min-w-11');
    await user.click(removeBtn);

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

    const btn = screen.getByRole('button', { name: 'Remove Advanced React Patterns from cart' });
    expect(btn).toHaveClass('h-9', 'w-9');
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

  // Tests for unavailable items
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

      const btn = screen.getByRole('button', { name: 'Remove Unavailable Course from cart' });
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
