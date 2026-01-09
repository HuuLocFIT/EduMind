import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading, PriceTag, ConfirmDialog, useToast } from "@edumind/user-ui";
import { useOrder, useCancelOrder, useRequestRefund } from "../../hooks/useOrders";
import { useInvoiceByOrder } from "../../hooks/useInvoices";
import {
  Package, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Download, FileText, RefreshCw,
} from "lucide-react";
import { USER_ROUTES, UserRouteHelpers, downloadBlob } from "@edumind/shared-utils";
import { OrderStatus } from "@edumind/shared-constants";
import { invoiceService } from "../../services/invoice.service";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
  [OrderStatus.PENDING]: { label: "Pending", color: "yellow", icon: Clock, description: "Your order is being processed" },
  [OrderStatus.PROCESSING]: { label: "Processing", color: "blue", icon: Clock, description: "Payment is being verified" },
  [OrderStatus.COMPLETED]: { label: "Completed", color: "green", icon: CheckCircle, description: "Order completed successfully" },
  [OrderStatus.FAILED]: { label: "Failed", color: "red", icon: XCircle, description: "Payment failed" },
  [OrderStatus.CANCELLED]: { label: "Cancelled", color: "gray", icon: XCircle, description: "Order was cancelled" },
  [OrderStatus.REFUNDED]: { label: "Refunded", color: "blue", icon: RefreshCw, description: "Refund has been processed" },
};

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState("");

  // Server state
  const { data: order, isLoading, error, refetch } = useOrder(Number(orderId), !!orderId);
  const { data: invoice } = useInvoiceByOrder(Number(orderId), !!orderId);
  const cancelOrder = useCancelOrder();
  const requestRefund = useRequestRefund();

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

  const handleRequestRefund = () => {
    if (!orderId) return;
    requestRefund.mutate({ orderId: Number(orderId), reason: refundReason }, {
      onSuccess: () => {
        setIsRefundDialogOpen(false);
        setRefundReason("");
        showSuccess("Refund request submitted");
        refetch();
      },
      onError: (err: Error) => {
        showError(err.message || "Failed to request refund");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">
            {(error as Error)?.message || "Unable to load order details"}
          </p>
          <Button variant="primary" onClick={() => navigate(USER_ROUTES.ORDERS)}>
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG[OrderStatus.PENDING];
  const StatusIcon = statusConfig.icon;
  const canCancel = order.status === OrderStatus.PENDING;
  const canRefund = order.status === OrderStatus.COMPLETED;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(USER_ROUTES.ORDERS)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                size="sm"
              >
                Back to Orders
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  Order #{order.orderNumber}
                </h1>
                <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <Card className={`p-6 border-l-4 ${
                statusConfig.color === "green" ? "border-l-green-500" :
                statusConfig.color === "yellow" ? "border-l-yellow-500" :
                statusConfig.color === "red" ? "border-l-red-500" :
                statusConfig.color === "blue" ? "border-l-blue-500" :
                statusConfig.color === "orange" ? "border-l-orange-500" :
                "border-l-gray-500"
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    statusConfig.color === "green" ? "bg-green-100 text-green-600" :
                    statusConfig.color === "yellow" ? "bg-yellow-100 text-yellow-600" :
                    statusConfig.color === "red" ? "bg-red-100 text-red-600" :
                    statusConfig.color === "blue" ? "bg-blue-100 text-blue-600" :
                    statusConfig.color === "orange" ? "bg-orange-100 text-orange-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{statusConfig.label}</h2>
                    <p className="text-sm text-gray-600">{statusConfig.description}</p>
                  </div>
                </div>
              </Card>

              {/* Order Items */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Items ({order.items?.length || 0})
                </h3>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.courseId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-20 h-14 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                        {item.courseThumbnailUrl ? (
                          <img
                            src={item.courseThumbnailUrl}
                            alt={item.courseTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={UserRouteHelpers.courseDetail(item.courseId)}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {item.courseTitle}
                        </Link>
                        <p className="text-sm text-gray-500">{item.instructorName}</p>
                      </div>
                      <PriceTag price={item.finalPrice} size="sm" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              {(canCancel || canRefund) && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                  <div className="flex gap-3">
                    {canCancel && (
                      <Button
                        variant="secondary"
                        onClick={() => setIsCancelDialogOpen(true)}
                      >
                        Cancel Order
                      </Button>
                    )}
                    {canRefund && (
                      <Button
                        variant="outline"
                        onClick={() => setIsRefundDialogOpen(true)}
                      >
                        Request Refund
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Summary */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${order.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  {(order as any).discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-green-600">-${(order as any).discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total:</span>
                      <PriceTag price={order.totalAmount} size="md" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Info */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span>{order.paymentMethod}</span>
                  </div>
                  {(order as any).transaction && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction:</span>
                      <span className="font-mono text-xs">{(order as any).transaction.transactionId}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Invoice */}
              {invoice && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Invoice</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">PDF Invoice</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadInvoice}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download Invoice
                  </Button>
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

      {/* Refund Dialog */}
      <ConfirmDialog
        isOpen={isRefundDialogOpen}
        onClose={() => setIsRefundDialogOpen(false)}
        onConfirm={handleRequestRefund}
        title="Request Refund"
        message="Please provide a reason for your refund request. Our team will review it within 3-5 business days."
        confirmText="Submit Request"
        cancelText="Cancel"
        variant="warning"
        isLoading={requestRefund.isPending}
      />
    </>
  );
};

export default OrderDetailPage;
