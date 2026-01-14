import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersPage } from './OrdersPage';
import { useOrders, useOrderCounts } from '../../hooks/useOrders';
import { USER_ROUTES, UserRouteHelpers } from '@edumind/shared-utils';
import { OrderStatus } from '@edumind/shared-constants';
import { useToast } from '@edumind/user-ui';

// Mock Dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../hooks/useOrders');

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Loading: () => <div>Loading...</div>,
  useToast: vi.fn(),
}));

// Mock Lucide Icons to prevent rendering issues
vi.mock('lucide-react', () => ({
  Clock: () => <span>ClockIcon</span>,
  CheckCircle: () => <span>CheckCircleIcon</span>,
  XCircle: () => <span>XCircleIcon</span>,
  RefreshCw: () => <span>RefreshIcon</span>,
  Box: () => <span>BoxIcon</span>,
  Eye: () => <span>EyeIcon</span>,
  Calendar: () => <span>CalendarIcon</span>,
}));

vi.mock('@edumind/shared-utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    formatDateTime: (date: string) => `Formatted: ${date}`,
    buildRouteWithParams: (route: string, params: any) => `${route.replace(':orderId', params.orderId)}`,
  };
});

describe('OrdersPage', () => {
  const mockRefetch = vi.fn();
  const mockShowError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useToast as any).mockReturnValue({
      error: mockShowError,
    });

    // Default Mocks
    (useOrders as any).mockReturnValue({
      data: { data: [], pagination: { totalPages: 0 } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (useOrderCounts as any).mockReturnValue({
      data: { total: 0, pending: 0, completed: 0, cancelled: 0 },
    });
  });

  const mockOrders = [
    {
      id: 101,
      orderNumber: 'ORD-101',
      status: OrderStatus.COMPLETED,
      totalAmount: 99.99,
      currency: 'USD',
      createdAt: '2023-01-01T12:00:00Z',
      itemCount: 1,
      firstCourseTitle: 'React Masterclass',
      firstCourseThumbnail: 'http://img.com/react.jpg',
    },
    {
      id: 102,
      orderNumber: 'ORD-102',
      status: OrderStatus.PENDING,
      totalAmount: 49.99,
      currency: 'USD',
      createdAt: '2023-01-02T12:00:00Z',
      itemCount: 2,
      firstCourseTitle: 'Advanced TS',
    },
  ];

  it('renders loading state', () => {
    (useOrders as any).mockReturnValue({ isLoading: true, data: { data: [] } });
    render(<OrdersPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state with retry', async () => {
    const user = userEvent.setup();
    (useOrders as any).mockReturnValue({ 
      error: new Error('Load failed'),
      refetch: mockRefetch,
      data: { data: [] }
    });

    render(<OrdersPage />);
    
    expect(screen.getByText('Load failed')).toBeInTheDocument();
    
    await user.click(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders empty state (All Filter)', async () => {
    const user = userEvent.setup();
    render(<OrdersPage />); // Default is empty in beforeEach

    expect(screen.getByText("You haven't placed any orders yet.")).toBeInTheDocument();
    
    await user.click(screen.getByText('Browse Courses'));
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.COURSES);
  });

  it('renders populated list of orders', () => {
    (useOrders as any).mockReturnValue({ 
      data: { data: mockOrders, pagination: { totalPages: 1 } }, 
      isLoading: false 
    });

    render(<OrdersPage />);

    expect(screen.getByText('ORD-101')).toBeInTheDocument();
    expect(screen.getByText('ORD-102')).toBeInTheDocument();
    expect(screen.getByText('React Masterclass')).toBeInTheDocument();
    expect(screen.getByText('Advanced TS')).toBeInTheDocument();
    
    // Status badges - Use getAllByText and check constraints or specific filtering
    // Since "Completed" appears in the Filter Button AND the Status Badge
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    
    // Item count badge logic
    expect(screen.getByText('+1 more')).toBeInTheDocument(); // For order 102 which has itemCount: 2
  });

  it('handles filtering', async () => {
    const user = userEvent.setup();
    (useOrders as any).mockReturnValue({ 
      data: { data: [], pagination: { totalPages: 0 } }, 
      isLoading: false 
    });

    render(<OrdersPage />);
    
    // Click Pending Filter
    await user.click(screen.getByText('Pending'));
    
    // Check if useOrders was called with new status in re-render
    // Since mock is static, we can check the call arguments of the hook?
    // Vitest mock state is updated.
    // However, `useOrders` is called inside the component render. 
    // To verify that `setStatusFilter` triggered a re-render with new params, 
    // we inspect the last call to useOrders.
    
    expect(useOrders).toHaveBeenLastCalledWith(expect.objectContaining({
      status: OrderStatus.PENDING,
      page: 0
    }));
  });

  it('handles pagination', async () => {
    const user = userEvent.setup();
    (useOrders as any).mockReturnValue({ 
      data: { data: mockOrders, pagination: { totalPages: 2 } }, 
      isLoading: false 
    });

    render(<OrdersPage />);
    
    // Initial page 0 (Page 1 in UI)
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    
    // Click Next
    await user.click(screen.getByText('→'));
    
    expect(useOrders).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1
    }));
  });

  it('navigates to order detail on click', async () => {
    const user = userEvent.setup();
    (useOrders as any).mockReturnValue({ 
      data: { data: [mockOrders[0]] }, 
      isLoading: false 
    });

    render(<OrdersPage />);
    
    // Click View Details button
    await user.click(screen.getByText('View Details'));
    
    // Expected route: /orders/101 (assuming helper logic)
    expect(mockNavigate).toHaveBeenCalledWith('/orders/101');
  });
});
