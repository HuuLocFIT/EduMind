import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, useToast } from "@edumind/user-ui";
import { OrdersSkeleton } from "../../components/route-skeletons/OrdersSkeleton";
import { useOrders, useOrderCounts } from "../../hooks/useOrders";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Eye,
  CreditCard,
  TrendingUp,
  Box
} from "lucide-react";
import { USER_ROUTES, buildRouteWithParams, formatDateTime } from "@edumind/shared-utils";
import { OrderStatus } from "@edumind/shared-constants";
import type { OrderSummaryResponse } from "@edumind/shared-types";


const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Clock }> = {
  [OrderStatus.PENDING]: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock
  },
  [OrderStatus.PROCESSING]: {
    label: "Processing",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Clock
  },
  [OrderStatus.COMPLETED]: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle
  },
  [OrderStatus.FAILED]: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelled",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: XCircle
  },
  [OrderStatus.REFUNDED]: {
    label: "Refunded",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: RefreshCw
  },
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

  // Derived state
  const totalSpent = useMemo(() => {
    // Note: This is only for the current page as we don't have a global total API yet
    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  }, [orders]);

  const handleViewOrder = (orderId: number) => {
    navigate(buildRouteWithParams(USER_ROUTES.ORDER_DETAIL, { orderId }));
  };



  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Filter orders by status if selected
  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  // Loading state
  if (isLoading && orders.length === 0) {
    return <OrdersSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                <Box className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">My Orders</h1>
                <p className="text-blue-100 text-lg">
                  View and manage your purchase history
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(USER_ROUTES.REFUNDS)}
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 flex-shrink-0"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              My Refunds
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={() => { setStatusFilter("all"); setPage(0); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${statusFilter === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
          >
            All Orders
            {counts && <span className="ml-2 opacity-80 text-xs">{(counts.total || 0)}</span>}
          </button>
          {[OrderStatus.COMPLETED, OrderStatus.PENDING, OrderStatus.CANCELLED].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(0); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${statusFilter === status
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {STATUS_CONFIG[status].label}
              {counts && (counts[status.toLowerCase() as keyof typeof counts] as number) > 0 && (
                <span className="ml-2 opacity-80 text-xs">{counts[status.toLowerCase() as keyof typeof counts]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p>{(error as Error)?.message || "Failed to load orders"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && filteredOrders.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Box className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {statusFilter === "all"
                    ? "You haven't placed any orders yet."
                    : `No ${STATUS_CONFIG[statusFilter].label} orders found.`}
              </p>
              {statusFilter !== "all" ? (
                <Button variant="outline" onClick={() => { setStatusFilter("all"); }}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate(USER_ROUTES.COURSES)}>
                  Browse Courses
                </Button>
              )}
            </Card>
          )}

          {filteredOrders.map((order: OrderSummaryResponse) => {
            const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG[OrderStatus.PENDING];

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Order Meta Header */}
                <div className="bg-gray-50/50 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                      <span className="font-mono font-medium text-gray-900">{order.orderNumber}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                    <statusConfig.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Order Content */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Course Thumbnail */}
                    <div className="w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative">
                      {order.firstCourseThumbnail ? (
                        <img
                          src={order.firstCourseThumbnail}
                          alt={order.firstCourseTitle || "Course Thumbnail"}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Box className="w-8 h-8 opacity-50" />
                        </div>
                      )}

                      {/* Item count badge if > 1 */}
                      {order.itemCount > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                          +{order.itemCount - 1} more
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleViewOrder(order.id)}>
                            {order.firstCourseTitle || "Untitled Order"}
                          </h3>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount, order.currency)}</p>
                            {/* Placeholder for original price if we had it */}
                            {/* <p className="text-xs text-gray-400 line-through">$99.99</p> */}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          {order.itemCount} {order.itemCount === 1 ? "Course" : "Courses"} • Lifetime Access
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-auto pt-4 sm:pt-0">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => {
                            handleViewOrder(order.id);
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

export default OrdersPage;
