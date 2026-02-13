import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading, ConfirmDialog, useToast } from "@edumind/user-ui";
import { useOrder, useCancelOrder } from "../../hooks/useOrders";
import { useInvoiceByOrder } from "../../hooks/useInvoices";
import { useRefundByOrder } from "../../hooks/useRefunds";
import { RefundRequestModal } from "./components/RefundRequestModal";
import {
  Package, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Download, FileText, RefreshCw, CreditCard, Receipt, Calendar,
  User, Hash, Eye,
} from "lucide-react";
import { USER_ROUTES, UserRouteHelpers, downloadBlob, formatDateTime } from "@edumind/shared-utils";
import { OrderStatus } from "@edumind/shared-constants";
import { invoiceService } from "../../services/invoice.service";

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
  description: string;
  gradient: string;
}> = {
  [OrderStatus.PENDING]: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
    description: "Your order is being processed",
    gradient: "from-amber-50 to-amber-100/50",
  },
  [OrderStatus.PROCESSING]: {
    label: "Processing",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Clock,
    description: "Payment is being verified",
    gradient: "from-blue-50 to-blue-100/50",
  },
  [OrderStatus.COMPLETED]: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    description: "Order completed successfully",
    gradient: "from-emerald-50 to-emerald-100/50",
  },
  [OrderStatus.FAILED]: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    description: "Payment failed",
    gradient: "from-red-50 to-red-100/50",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelled",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: XCircle,
    description: "Order was cancelled",
    gradient: "from-gray-50 to-gray-100/50",
  },
  [OrderStatus.REFUNDED]: {
    label: "Refunded",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: RefreshCw,
    description: "Refund has been processed",
    gradient: "from-purple-50 to-purple-100/50",
  },
};

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);

  // Server state
  const { data: order, isLoading, error, refetch } = useOrder(Number(orderId), !!orderId);
  const { data: invoice } = useInvoiceByOrder(Number(orderId), !!orderId);
  const { data: existingRefund } = useRefundByOrder(Number(orderId), !!orderId && order?.status === OrderStatus.COMPLETED);
  const cancelOrder = useCancelOrder();

  const handleCancelOrder = () => {
    if (!orderId) return;
    cancelOrder.mutate(Number(orderId), {
      onSuccess: () => {
        setIsCancelDialogOpen(false);
        showSuccess("Order cancelled successfully");
        refetch();
      },
      onError: (err: Error) => {
        showError(err.message || "Failed to cancel order");
      },
    });
  };

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    try {
      const blob = await invoiceService.downloadInvoicePdf(invoice.id);
      downloadBlob(blob, `${invoice.invoiceNumber}.pdf`);
      showSuccess("Invoice downloaded");
    } catch (err: any) {
      showError(err.message || "Failed to download invoice");
    }
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 sm:p-12 max-w-md text-center rounded-2xl border border-gray-200 shadow-lg">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            {(error as Error)?.message || "Unable to load order details"}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(USER_ROUTES.ORDERS)}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
          >
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG[OrderStatus.PENDING];
  const StatusIcon = statusConfig.icon;
  const canCancel = order.status === OrderStatus.PENDING;
  const canRefund = order.status === OrderStatus.COMPLETED && !existingRefund;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
            {/* Mobile: Back + Order Info on same row, Status below | Desktop: All on same row */}
            <div className="space-y-3 sm:space-y-0">
              {/* First Row: Back Button + Order Info */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* Back Button */}
                <button
                  onClick={() => navigate(USER_ROUTES.ORDERS)}
                  className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-200 flex-shrink-0 group"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium text-white">Back to Orders</span>
                </button>
                
                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 flex-shrink-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold break-words sm:truncate">
                        Order #{order.orderNumber}
                      </h1>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-100">
                           <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                           <span className="break-words sm:truncate">{formatDateTime(order.createdAt)}</span>
                        </div>
                        <span className="hidden sm:inline text-blue-300 mx-1">|</span>
                        <div className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 bg-white/20 backdrop-blur-md text-white border border-white/30`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusConfig.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Status Badge - Desktop only */}
                <div className={`hidden sm:flex px-4 py-2 rounded-full text-sm font-semibold items-center gap-2 bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm flex-shrink-0`}>
                  <StatusIcon className="w-4 h-4" />
                  <span>{statusConfig.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Sidebar - Show FIRST on mobile */}
            <div className="order-1 lg:order-2 lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Order Summary */}
              <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Order Summary</h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base">
                    <span className="text-gray-600 font-medium">Subtotal:</span>
                    <span className="font-semibold text-gray-900 text-right break-words">{formatCurrency(order.subtotal || 0, order.currency)}</span>
                  </div>
                  {(order as any).discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base">
                      <span className="text-gray-600 font-medium">Discount:</span>
                      <span className="font-semibold text-emerald-600 text-right break-words">-{formatCurrency((order as any).discountAmount, order.currency)}</span>
                    </div>
                  )}
                  <div className="pt-3 sm:pt-4 border-t-2 border-gray-100">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Total:</span>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 text-right break-words">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Info */}
              <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Payment Information</h3>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Method:</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 capitalize text-right">{order.paymentMethod}</span>
                  </div>
                  {(order as any).transaction && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 font-medium">Transaction ID</span>
                      </div>
                      <span className="font-mono text-xs sm:text-sm text-gray-900 break-all">{((order as any).transaction.transactionId || "").substring(0, 20)}...</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Invoice */}
              {invoice && (
                <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Invoice</h3>
                  </div>
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl mb-3 sm:mb-4 border border-blue-200/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 break-words mb-0.5">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-600">PDF Document</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm"
                    onClick={handleDownloadInvoice}
                    leftIcon={<Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  >
                    Download Invoice
                  </Button>
                </Card>
              )}
            </div>

            {/* Main Content */}
            <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Order Items */}
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                        Order Items
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        {order.items?.length || 0} {order.items?.length === 1 ? "course" : "courses"} in this order
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {order.items?.map((item, index) => (
                    <Link
                      key={item.courseId}
                      to={UserRouteHelpers.courseDetail(item.courseId)}
                      className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-300"
                    >
                      <div className="w-full sm:w-20 sm:h-14 lg:w-24 lg:h-16 aspect-video sm:aspect-auto rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                        {item.courseThumbnailUrl ? (
                          <img
                            src={item.courseThumbnailUrl}
                            alt={item.courseTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
                          {item.courseTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 sm:mb-0">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.instructorName}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-0">
                        <div className="text-base sm:text-lg font-bold text-gray-900">
                          {formatCurrency(item.finalPrice, order.currency)}
                        </div>
                        {item.originalPrice && item.originalPrice > item.finalPrice && (
                          <div className="text-xs text-gray-400 line-through">
                            {formatCurrency(item.originalPrice, order.currency)}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Existing Refund Info */}
              {existingRefund && (
                <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-blue-200 shadow-sm bg-blue-50/30">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Refund Request</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      You have already submitted a refund request for this order.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(UserRouteHelpers.refundDetail(existingRefund.id))}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm"
                      leftIcon={<Eye className="w-4 h-4" />}
                    >
                      View Refund Status
                    </Button>
                  </div>
                </Card>
              )}

              {/* Actions */}
              {(canCancel || canRefund) && (
                <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Order Actions</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    {canCancel && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCancelDialogOpen(true)}
                        className="w-full sm:w-auto bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm"
                      >
                        Cancel Order
                      </Button>
                    )}
                    {canRefund && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRefundModalOpen(true)}
                        className="w-full sm:w-auto bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all text-xs sm:text-sm"
                      >
                        Request Refund
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        isLoading={cancelOrder.isPending}
      />

      {/* Refund Request Modal */}
      <RefundRequestModal
        orderId={Number(orderId)}
        paymentMethod={order?.paymentMethod}
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        onSuccess={(refundId) => {
          setIsRefundModalOpen(false);
          showSuccess("Refund request submitted successfully");
          refetch();
          // Navigate to refund detail page
          if (refundId) {
            setTimeout(() => {
              navigate(UserRouteHelpers.refundDetail(refundId));
            }, 1000);
          }
        }}
      />
    </>
  );
};

export default OrderDetailPage;
