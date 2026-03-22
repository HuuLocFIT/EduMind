import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderDetailPage } from './OrderDetailPage';
import { useOrder, useCancelOrder } from '../../hooks/useOrders';
import { useInvoiceByOrder } from '../../hooks/useInvoices';
import { useRefundByOrder } from '../../hooks/useRefunds';
import { invoiceService } from '../../services/invoice.service';
import { USER_ROUTES } from '@edumind/shared-utils';
import { OrderStatus } from '@edumind/shared-constants';
import { useToast } from '@edumind/user-ui';

// Mock Dependencies
const mockNavigate = vi.fn();
// Use a mutable orderId to simulate route changes
let mockOrderId: string | undefined = '123';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ orderId: mockOrderId }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../hooks/useOrders');
vi.mock('../../hooks/useInvoices');
vi.mock('../../hooks/useRefunds');
vi.mock('../../services/invoice.service');
vi.mock('./components/RefundRequestModal', () => ({
  RefundRequestModal: ({ isOpen, onClose, onSuccess }: any) => 
    isOpen ? (
      <div data-testid="refund-request-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Submit Refund</button>
      </div>
    ) : null,
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled, className, isLoading }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {isLoading ? 'Processing...' : children}
    </button>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Loading: () => <div>Loading...</div>,
  ConfirmDialog: ({ isOpen, onConfirm, onCancel, title }: any) => 
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h1>{title}</h1>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
  useToast: vi.fn(),
  PriceTag: ({ price }: any) => <span>${price}</span>,
}));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Package: () => <span>PackageIcon</span>,
  ArrowLeft: () => <span>ArrowLeftIcon</span>,
  Clock: () => <span>ClockIcon</span>,
  CheckCircle: () => <span>CheckCircleIcon</span>,
  XCircle: () => <span>XCircleIcon</span>,
  AlertCircle: () => <span>AlertCircleIcon</span>,
  Download: () => <span>DownloadIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  RefreshCw: () => <span>RefreshIcon</span>,
  CreditCard: () => <span>CreditCardIcon</span>,
  Receipt: () => <span>ReceiptIcon</span>,
  Calendar: () => <span>CalendarIcon</span>,
  User: () => <span>UserIcon</span>,
  Hash: () => <span>HashIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
}));

vi.mock('@edumind/shared-utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    formatDateTime: (date: string) => `Formatted: ${date}`,
    UserRouteHelpers: {
      courseDetail: (id: number) => `/courses/${id}`,
    },
    downloadBlob: vi.fn(),
  };
});

describe('OrderDetailPage', () => {
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockRefetch = vi.fn();
  
  const mockCancelMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderId = '123';

    (useToast as any).mockReturnValue({
      success: mockShowSuccess,
      error: mockShowError,
    });

    (useOrder as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (useInvoiceByOrder as any).mockReturnValue({
      data: null,
    });

    (useCancelOrder as any).mockReturnValue({
      mutate: mockCancelMutate,
      isPending: false,
    });

    (useRefundByOrder as any).mockReturnValue({
      data: null,
    });
  });

  const mockOrderData = {
    id: 123,
    orderNumber: 'ORD-123',
    status: OrderStatus.COMPLETED,
    totalAmount: 100,
    currency: 'USD',
    createdAt: '2023-01-01',
    paymentMethod: 'PAYPAL',
    items: [
      { courseId: 1, courseTitle: 'React Course', finalPrice: 50, instructorName: 'John Doe' },
      { courseId: 2, courseTitle: 'Node Course', finalPrice: 50, instructorName: 'Jane Smith' },
    ],
    transaction: { transactionId: 'TXN-123' },
  };

  it('renders loading state', () => {
    (useOrder as any).mockReturnValue({ isLoading: true });
    render(<OrderDetailPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    const user = userEvent.setup();
    (useOrder as any).mockReturnValue({ 
      error: new Error('Order not found'), 
      isLoading: false 
    });

    render(<OrderDetailPage />);
    
    expect(screen.getByText('Order Not Found')).toBeInTheDocument();
    
    await user.click(screen.getByText('Back to Orders'));
    expect(mockNavigate).toHaveBeenCalledWith(USER_ROUTES.ORDERS);
  });

  it('renders order details correctly', () => {
    (useOrder as any).mockReturnValue({ data: mockOrderData, isLoading: false });

    render(<OrderDetailPage />);

    expect(screen.getByText('Order #ORD-123')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('React Course')).toBeInTheDocument();
    // Use ignore option for capitalization or regex if needed, but 'payPal' should match mock data. 
    // If it's capitalized in UI, let's use regex or just check presence.
    expect(screen.getAllByText(/paypal/i).length).toBeGreaterThan(0); 
    expect(screen.getByText('TXN-123...')).toBeInTheDocument();
  });

  it('handles invoice download', async () => {
    const user = userEvent.setup();
    (useOrder as any).mockReturnValue({ data: mockOrderData, isLoading: false, refetch: mockRefetch });
    (useInvoiceByOrder as any).mockReturnValue({ 
      data: { id: 99, invoiceNumber: 'INV-99' } 
    });
    
    (invoiceService.downloadInvoicePdf as any).mockResolvedValue(new Blob(['pdf content']));

    render(<OrderDetailPage />);
    
    expect(screen.getByText('Download Invoice')).toBeInTheDocument();
    await user.click(screen.getByText('Download Invoice'));
    
    expect(invoiceService.downloadInvoicePdf).toHaveBeenCalledWith(99);
    expect(mockShowSuccess).toHaveBeenCalledWith('Invoice downloaded');
  });

  it('handles cancellation (Pending Order)', async () => {
    const user = userEvent.setup();
    const pendingOrder = { ...mockOrderData, status: OrderStatus.PENDING };
    
    // Ensure refetch provided
    (useOrder as any).mockReturnValue({ data: pendingOrder, isLoading: false, refetch: mockRefetch });
    
    render(<OrderDetailPage />);
    
    // Click Cancel Order
    await user.click(screen.getByText('Cancel Order'));
    
    // Check Dialog
    // Check Dialog Title
    // "Cancel Order" appears in the Trigger Button AND the Dialog Title.
    // We expect the dialog to be open now, so we can look for it specifically or assert count.
    const dialog = screen.getByTestId('confirm-dialog');
    expect(dialog).toBeInTheDocument();
    
    // Confirm
    await user.click(screen.getByText('Confirm'));
    
    expect(mockCancelMutate).toHaveBeenCalled();
    // Simulate success
    mockCancelMutate.mock.calls[0][1].onSuccess();
    expect(mockShowSuccess).toHaveBeenCalledWith('Order cancelled successfully');
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles refund request (Completed Order)', async () => {
    const user = userEvent.setup();
    // Ensure refetch is available in the return value
    (useOrder as any).mockReturnValue({ 
      data: mockOrderData, 
      isLoading: false,
      refetch: mockRefetch 
    });
    
    render(<OrderDetailPage />);
    
    // Click Request Refund
    await user.click(screen.getByText('Request Refund'));
    
    // Modal opens
    expect(screen.getByTestId('refund-request-modal')).toBeInTheDocument();
    
    // Submit refund via modal
    await user.click(screen.getByText('Submit Refund'));
    
    // Verify success callback was called
    expect(mockShowSuccess).toHaveBeenCalledWith('Refund request submitted successfully');
    expect(mockRefetch).toHaveBeenCalled();
  });
});
