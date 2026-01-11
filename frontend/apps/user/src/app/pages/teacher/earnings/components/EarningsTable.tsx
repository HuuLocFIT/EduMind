import React from "react";
import { BookOpen, ChevronDown, Clock, CheckCircle, CreditCard, FileText } from "lucide-react";
import { EarningStatus } from "@edumind/shared-constants";
import type { EarningResponse, PagedResponse } from "@edumind/shared-types";
import { formatDate } from "@edumind/shared-utils";
import { Pagination } from "../../../../../app/components/teacher/courses/list";

interface EarningsTableProps {
  earnings: EarningResponse[];
  pagination?: PagedResponse<EarningResponse>["pagination"];
  loading?: boolean;
  onPageChange: (page: number) => void;
}

const EarningStatusBadge: React.FC<{ status: EarningStatus }> = ({ status }) => {
  // Config matches user's design: PENDING (Yellow), AVAILABLE (Green), PAID (Blue)
  const config: Record<string, { bg: string; text: string; label: string }> = {
    [EarningStatus.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    [EarningStatus.AVAILABLE]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Available' },
    [EarningStatus.PAID]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid Out' },
    [EarningStatus.REFUNDED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refunded' },
  };

  const { bg, text, label } = config[status] || config[EarningStatus.PENDING];

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
};

export const EarningsTable: React.FC<EarningsTableProps> = ({
  earnings,
  pagination,
  loading,
  onPageChange,
}) => {
  const totalElements = pagination?.totalElements ?? earnings.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 0;
  const pageSize = pagination?.size ?? 10;

  if (!loading && earnings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No transactions yet
        </h3>
        <p className="text-gray-600">
          Your latest sales and earnings will appear here.
        </p>
      </div>
    );
  }

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        <p className="text-sm text-gray-500">Your latest sales and earnings</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fee</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {earnings.map((earning) => (
              <tr key={earning.id} className="hover:bg-gray-50">
                {/* Order */}
                <td className="px-6 py-4">
                   <span className="text-sm font-mono">
                      #{earning.orderNumber}
                   </span>
                </td>

                {/* Course */}
                <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 line-clamp-1" title={earning.courseTitle || ""}>
                      {earning.courseTitle || "Unknown"}
                    </span>
                </td>

                {/* Student */}
                <td className="px-6 py-4">
                   <span className="text-sm text-gray-600">
                      {earning.buyerName || "Student"}
                   </span>
                </td>

                {/* Gross */}
                <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-900">
                      {formatMoney(earning.grossAmount, earning.currency)}
                    </span>
                </td>
                
                {/* Fee */}
                <td className="px-6 py-4 text-right">
                    <span className="text-sm text-red-600">
                      -{formatMoney(earning.platformFeeAmount, earning.currency)}
                    </span>
                </td>

                {/* Net */}
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-semibold text-green-600">
                    {formatMoney(earning.netAmount, earning.currency)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <EarningStatusBadge status={earning.status} />
                </td>
                
                {/* Date */}
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {formatDate(earning.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {/* Pagination */}
      {totalPages > 1 && pagination && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
           <p className="text-sm text-gray-500">
            Showing {currentPage * pageSize + 1} to{" "}
            {Math.min(
              (currentPage + 1) * pageSize,
              totalElements || earnings.length
            )}{" "}
            of {totalElements} results
          </p>
          <Pagination
            page={pagination.page}
            size={pagination.size}
            totalElements={pagination.totalElements}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};
