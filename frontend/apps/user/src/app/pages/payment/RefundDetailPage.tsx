import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading } from "@edumind/user-ui";
import { useRefund } from "../../hooks/useRefunds";
import {
  RefreshCw,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Hash,
  FileText,
  Package,
} from "lucide-react";
import { USER_ROUTES, UserRouteHelpers, formatDateTime, buildRouteWithParams } from "@edumind/shared-utils";
import { RefundStatus } from "@edumind/shared-constants";

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
  description: string;
  gradient: string;
}> = {
  [RefundStatus.PENDING]: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
    description: "Your refund request is being reviewed",
    gradient: "from-amber-50 to-amber-100/50",
  },
  [RefundStatus.APPROVED]: {
    label: "Approved",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CheckCircle,
    description: "Your refund has been approved and is being processed",
    gradient: "from-blue-50 to-blue-100/50",
  },
  [RefundStatus.AWAITING_MANUAL_REFUND]: {
    label: "Approved - Processing",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: Clock,
    description: "Your refund has been approved. Manual bank transfer is in progress",
    gradient: "from-indigo-50 to-indigo-100/50",
  },
  [RefundStatus.REJECTED]: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    description: "Your refund request has been rejected",
    gradient: "from-red-50 to-red-100/50",
  },
  [RefundStatus.COMPLETED]: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    description: "Refund has been processed successfully",
    gradient: "from-emerald-50 to-emerald-100/50",
  },
  [RefundStatus.FAILED]: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    description: "Refund processing failed",
    gradient: "from-red-50 to-red-100/50",
  },
};

export const RefundDetailPage: React.FC = () => {
  const { refundId } = useParams<{ refundId: string }>();
  const navigate = useNavigate();

  // Server state
  const { data: refund, isLoading, error } = useRefund(Number(refundId), !!refundId);

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
  if (error || !refund) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 sm:p-12 max-w-md text-center rounded-2xl border border-gray-200 shadow-lg">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Refund Not Found</h2>
          <p className="text-gray-600 mb-6">
            {(error as Error)?.message || "Unable to load refund details"}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(USER_ROUTES.REFUNDS)}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
          >
            Back to Refunds
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[refund.status as RefundStatus] || STATUS_CONFIG[RefundStatus.PENDING];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="space-y-3 sm:space-y-0">
            {/* First Row: Back Button + Refund Info */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              {/* Back Button */}
              <button
                onClick={() => navigate(USER_ROUTES.REFUNDS)}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-200 flex-shrink-0 group"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="hidden sm:inline ml-2 text-sm font-medium text-white">Back to Refunds</span>
              </button>
              
              {/* Refund Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 flex-shrink-0">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold break-words sm:truncate">
                      Refund Request #{refund.id}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-100">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="break-words sm:truncate">{formatDateTime(refund.requestedAt)}</span>
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
          
          {/* Sidebar */}
          <div className="order-1 lg:order-2 lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Refund Summary */}
            <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Refund Summary</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base">
                  <span className="text-gray-600 font-medium">Amount:</span>
                  <span className="font-semibold text-gray-900 text-right break-words">
                    {formatCurrency(refund.requestedAmount, refund.currency)}
                  </span>
                </div>
                <div className="pt-3 sm:pt-4 border-t-2 border-gray-100">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Status:</span>
                    <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Refund Information */}
            <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                    Refund Information
                  </h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Order Number</span>
                  </div>
                  <Link
                    to={buildRouteWithParams(USER_ROUTES.ORDER_DETAIL, { orderId: refund.orderId })}
                    className="font-mono text-sm sm:text-base text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {refund.orderNumber}
                  </Link>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Reason</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{refund.reason}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Requested At</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-900">{formatDateTime(refund.requestedAt)}</p>
                </div>
              </div>
            </Card>

            {/* Status-Specific Information */}
            {refund.status === RefundStatus.APPROVED && refund.approvedAt && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Approval Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Approved on:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(refund.approvedAt)}</span>
                  </div>
                  {refund.approvedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Approved by:</span>
                      <span className="font-medium text-gray-900">
                        {refund.approvedByName || `Admin #${refund.approvedBy}`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {refund.status === RefundStatus.REJECTED && refund.rejectedAt && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-red-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Rejection Details</h3>
                </div>
                <div className="space-y-3">
                  {refund.rejectionReason && (
                    <div className="p-4 bg-red-50 rounded-xl">
                      <p className="text-sm text-red-900 whitespace-pre-wrap">{refund.rejectionReason}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Rejected on:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(refund.rejectedAt)}</span>
                  </div>
                  {refund.rejectedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Rejected by:</span>
                      <span className="font-medium text-gray-900">
                        {refund.rejectedByName || `Admin #${refund.rejectedBy}`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {refund.status === RefundStatus.FAILED && refund.processedAt && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-red-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Processing Failed</h3>
                </div>
                <div className="space-y-3">
                  {refund.gatewayResponse && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-700 font-medium">Error Message</span>
                      </div>
                      <p className="text-sm text-red-900 whitespace-pre-wrap">{refund.gatewayResponse}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Failed on:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(refund.processedAt)}</span>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-900">
                      <strong>Note:</strong> This refund requires manual processing. Please contact support for assistance.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {refund.status === RefundStatus.AWAITING_MANUAL_REFUND && refund.approvedAt && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Manual Processing Required</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-sm text-indigo-900">
                      <strong>Your refund has been approved.</strong> Our team is processing a manual bank transfer to complete your refund. This typically takes 1-3 business days.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Approved on:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(refund.approvedAt)}</span>
                  </div>
                  {refund.approvedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Approved by:</span>
                      <span className="font-medium text-gray-900">
                        {refund.approvedByName || `Admin #${refund.approvedBy}`}
                      </span>
                    </div>
                  )}
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-900">
                      <strong>Note:</strong> For bank transfer refunds (SePay), the refund will be processed manually. You will receive a notification once the transfer is completed.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {refund.status === RefundStatus.COMPLETED && refund.processedAt && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-emerald-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Processing Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Processed on:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(refund.processedAt)}</span>
                  </div>
                  {refund.refundTransactionId && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Transaction ID</span>
                      </div>
                      <p className="font-mono text-sm text-gray-900 break-all">{refund.refundTransactionId}</p>
                    </div>
                  )}
                  {refund.gatewayRefundId && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Gateway Refund ID</span>
                      </div>
                      <p className="font-mono text-sm text-gray-900 break-all">{refund.gatewayRefundId}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundDetailPage;
