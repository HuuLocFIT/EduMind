import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { TeacherPayoutDetailSkeleton } from "../../components/route-skeletons/teacher/TeacherPayoutDetailSkeleton";
import { usePayout } from "../../hooks/usePayouts";
import {
  Wallet,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Hash,
  FileText,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { TEACHER_ROUTES, TeacherRouteHelpers, formatDateTime } from "@edumind/shared-utils";
import { PayoutStatus, PayoutMethod } from "@edumind/shared-constants";

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
  description: string;
  gradient: string;
}> = {
  [PayoutStatus.PENDING]: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
    description: "Payout is pending processing",
    gradient: "from-amber-50 to-amber-100/50",
  },
  [PayoutStatus.PROCESSING]: {
    label: "Processing",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Clock,
    description: "Payout is being processed",
    gradient: "from-blue-50 to-blue-100/50",
  },
  [PayoutStatus.AWAITING_MANUAL_PAYOUT]: {
    label: "Awaiting Manual Transfer",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Clock,
    description: "Payout requires manual bank transfer by admin",
    gradient: "from-purple-50 to-purple-100/50",
  },
  [PayoutStatus.COMPLETED]: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    description: "Payout completed successfully",
    gradient: "from-emerald-50 to-emerald-100/50",
  },
  [PayoutStatus.FAILED]: {
    label: "Failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    description: "Payout processing failed",
    gradient: "from-red-50 to-red-100/50",
  },
};

export const TeacherPayoutDetailPage: React.FC = () => {
  const { payoutId } = useParams<{ payoutId: string }>();
  const navigate = useNavigate();

  // Server state
  const { data: payout, isLoading, error } = usePayout(Number(payoutId), !!payoutId);

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return <TeacherPayoutDetailSkeleton />;
  }

  // Error state
  if (error || !payout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 sm:p-12 max-w-md text-center rounded-2xl border border-gray-200 shadow-lg">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payout Not Found</h2>
          <p className="text-gray-600 mb-6">
            {(error as Error)?.message || "Unable to load payout details"}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(TEACHER_ROUTES.PAYOUTS)}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
          >
            Back to Payouts
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[payout.status as PayoutStatus] || STATUS_CONFIG[PayoutStatus.PENDING];
  const StatusIcon = statusConfig.icon;

  const getMethodLabel = (method: string) => {
    return method === PayoutMethod.BANK_TRANSFER ? "Bank Transfer" : method === PayoutMethod.PAYPAL ? "PayPal" : method;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={() => navigate(TEACHER_ROUTES.PAYOUTS)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Payouts</span>
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {payout.payoutNumber}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Requested on {formatDateTime(payout.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} shadow-sm self-start md:self-center`}>
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
            {/* Payout Summary */}
            <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Payout Summary</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base">
                  <span className="text-gray-600 font-medium">Amount:</span>
                  <span className="font-semibold text-gray-900 text-right break-words">
                    {formatCurrency(payout.totalAmount, payout.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm lg:text-base">
                  <span className="text-gray-600 font-medium">Method:</span>
                  <span className="font-semibold text-gray-900 text-right break-words">
                    {getMethodLabel(payout.paymentMethod)}
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

            {/* Failure Info Card */}
            {payout.status === PayoutStatus.FAILED && (
              <Card className="p-4 sm:p-5 lg:p-6 rounded-2xl border border-red-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Failure Information</h3>
                </div>
                <div className="space-y-3">
                  {payout.failureReason && (
                    <div className="p-3 bg-red-50 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">Reason</p>
                      <p className="text-sm text-red-900">{payout.failureReason}</p>
                    </div>
                  )}
                  {payout.failureCode && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">Error Code</p>
                      <p className="text-sm font-mono text-gray-900">{payout.failureCode}</p>
                    </div>
                  )}
                  {payout.retryCount !== null && payout.retryCount !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">Retry Count</p>
                      <p className="text-sm text-gray-900">{payout.retryCount}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Payout Information */}
            <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                    Payout Information
                  </h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Payout Number</span>
                  </div>
                  <p className="font-mono text-sm sm:text-base text-gray-900">{payout.payoutNumber}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Instructor ID</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-900">{payout.instructorId}</p>
                </div>

                {payout.scheduledAt && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">Scheduled At</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-900">{formatDateTime(payout.scheduledAt)}</p>
                  </div>
                )}

                {payout.processedAt && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">Processed At</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-900">{formatDateTime(payout.processedAt)}</p>
                  </div>
                )}

                {payout.gatewayTransactionId && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">Gateway Transaction ID</span>
                    </div>
                    <p className="font-mono text-sm text-gray-900 break-all">{payout.gatewayTransactionId}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Payout Items */}
            {payout.items && payout.items.length > 0 && (
              <Card className="p-4 sm:p-5 lg:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                      Payout Items ({payout.items.length})
                    </h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {payout.items.map((item, index) => (
                        <tr key={item.earningId || index} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">{item.courseTitle}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono text-gray-600">{item.orderNumber}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(item.netAmount, item.currency)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPayoutDetailPage;
