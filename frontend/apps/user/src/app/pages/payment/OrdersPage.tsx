import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Loading, PriceTag, useToast } from "@edumind/user-ui";
import { useOrders, useOrderCounts, useCancelOrder } from "../../hooks/useOrders";
import { Package, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import { USER_ROUTES, buildRouteWithParams } from "@edumind/shared-utils";
import { OrderStatus } from "@edumind/shared-constants";
import type { OrderSummaryResponse } from "@edumind/shared-types";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  [OrderStatus.PENDING]: { label: "Pending", color: "yellow", icon: Clock },
  [OrderStatus.PROCESSING]: { label: "Processing", color: "blue", icon: Clock },
  [OrderStatus.COMPLETED]: { label: "Completed", color: "green", icon: CheckCircle },
  [OrderStatus.FAILED]: { label: "Failed", color: "red", icon: XCircle },
  [OrderStatus.CANCELLED]: { label: "Cancelled", color: "gray", icon: XCircle },
  [OrderStatus.REFUNDED]: { label: "Refunded", color: "blue", icon: RefreshCw },
};

type StatusFilter = "all" | OrderStatus;

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // Server state
  const { data: ordersData, isLoading, error, refetch } = useOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    size: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: counts } = useOrderCounts();

  const orders = ordersData?.data || [];
  const totalPages = ordersData?.pagination?.totalPages || 0;

  const handleViewOrder = (orderId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.ORDER_DETAIL, { orderId }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">
                View and manage your order history
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setStatusFilter("all"); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            All {counts && `(${(counts.pending || 0) + (counts.completed || 0) + (counts.cancelled || 0) + (counts.failed || 0)})`}
          </button>
          <button
            onClick={() => { setStatusFilter(OrderStatus.PENDING); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === OrderStatus.PENDING
                ? "bg-yellow-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Pending {counts?.pending ? `(${counts.pending})` : ""}
          </button>
          <button
            onClick={() => { setStatusFilter(OrderStatus.COMPLETED); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === OrderStatus.COMPLETED
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Completed {counts?.completed ? `(${counts.completed})` : ""}
          </button>
          <button
            onClick={() => { setStatusFilter(OrderStatus.CANCELLED); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === OrderStatus.CANCELLED
                ? "bg-gray-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Cancelled {counts?.cancelled ? `(${counts.cancelled})` : ""}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{(error as Error)?.message || "Failed to load orders"}</p>
            <Button variant="secondary" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No orders found
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === "all"
                ? "You haven't made any purchases yet"
                : `No ${STATUS_CONFIG[statusFilter as OrderStatus]?.label || ""} orders`}
            </p>
            <Button variant="primary" onClick={() => navigate(USER_ROUTES.COURSES)}>
              Browse Courses
            </Button>
          </Card>
        )}

        {/* Orders List */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order: OrderSummaryResponse) => {
              const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG[OrderStatus.PENDING];
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={order.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Order Header */}
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-sm text-gray-500">
                          Order #{order.orderNumber}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          statusConfig.color === "green" ? "bg-green-100 text-green-800" :
                          statusConfig.color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                          statusConfig.color === "red" ? "bg-red-100 text-red-800" :
                          statusConfig.color === "blue" ? "bg-blue-100 text-blue-800" :
                          statusConfig.color === "orange" ? "bg-orange-100 text-orange-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Order Info */}
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>{formatDate(order.createdAt)}</span>
                        <span>{order.itemCount} {order.itemCount === 1 ? "course" : "courses"}</span>
                      </div>

                      {/* Course Title Preview */}
                      {order.firstCourseTitle && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 line-clamp-1">
                            {order.firstCourseTitle}
                            {order.itemCount > 1 && ` +${order.itemCount - 1} more`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center gap-4">
                      <PriceTag price={order.totalAmount} size="md" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order.id)}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
