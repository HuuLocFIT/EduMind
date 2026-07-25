import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, useToast } from "@edumind/user-ui";
import { RefundsSkeleton } from "../../components/route-skeletons/RefundsSkeleton";
import { useMyRefunds } from "../../hooks/useRefunds";
import {
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { USER_ROUTES, UserRouteHelpers, formatDateTime, buildRouteWithParams } from "@edumind/shared-utils";
import { RefundStatus } from "@edumind/shared-constants";
import type { RefundResponse } from "@edumind/shared-types";

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
}> = {
  [RefundStatus.PENDING]: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
  },
  [RefundStatus.APPROVED]: {
    label: "Approved",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CheckCircle,
  },
  [RefundStatus.AWAITING_MANUAL_REFUND]: {
    label: "Approved - Processing",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: Clock,
  },
  [RefundStatus.REJECTED]: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  [RefundStatus.COMPLETED]: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
  },
  [RefundStatus.FAILED]: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
};

export const RefundsPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [page, setPage] = useState(0);

  // Server state
  const { data: refundsData, isLoading, error, refetch } = useMyRefunds({
    page,
    size: 10,
    sortBy: "requestedAt",
    sortOrder: "desc",
  });

  const refunds = refundsData?.data || [];
  const totalPages = refundsData?.pagination?.totalPages || 0;

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Loading state
  if (isLoading && refunds.length === 0) {
    return <RefundsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">My Refund Requests</h1>
              <p className="text-blue-100 text-lg">
                Track the status of your refund requests
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Refunds List */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p>{(error as Error)?.message || "Failed to load refunds"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && refunds.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No refund requests found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                You haven't submitted any refund requests yet.
              </p>
              <Button variant="primary" onClick={() => navigate(USER_ROUTES.ORDERS)}>
                View Orders
              </Button>
            </Card>
          )}

          {refunds.map((refund: RefundResponse) => {
            const statusConfig = STATUS_CONFIG[refund.status as RefundStatus] || STATUS_CONFIG[RefundStatus.PENDING];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={refund.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Refund Meta Header */}
                <div className="bg-gray-50/50 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                      <span className="font-mono font-medium text-gray-900">#{refund.id}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <span className="font-medium">Order:</span>
                      <span className="font-mono">{refund.orderNumber}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{formatDateTime(refund.requestedAt)}</span>
                    </div>
                  </div>

                  <div className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                    <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Refund Content */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              Refund Request #{refund.id}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Order: {refund.orderNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              {formatCurrency(refund.requestedAmount, refund.currency)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3 mb-4 line-clamp-2">
                          <span className="font-medium">Reason:</span> {truncateText(refund.reason, 100)}
                        </p>
                        {refund.status === RefundStatus.FAILED && refund.gatewayResponse && (
                          <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-900 font-medium mb-1">Error:</p>
                            <p className="text-xs text-red-700 line-clamp-2">{truncateText(refund.gatewayResponse, 150)}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-auto pt-4 sm:pt-0">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => {
                            navigate(UserRouteHelpers.refundDetail(refund.id));
                          }}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-blue-200/50"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="w-10 h-10 p-0 rounded-full"
            >
              ←
            </Button>
            <span className="text-sm font-medium text-gray-600 px-4">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="w-10 h-10 p-0 rounded-full"
            >
              →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefundsPage;
