import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Wallet } from "lucide-react";
import { PayoutStatus, PayoutMethod } from "@edumind/shared-constants";
import type { PayoutResponse, PagedResponse } from "@edumind/shared-types";
import { formatDate, TeacherRouteHelpers } from "@edumind/shared-utils";
import { Pagination } from "../../../../components/teacher/courses/list";

interface PayoutsTableProps {
  payouts: PayoutResponse[];
  pagination?: PagedResponse<PayoutResponse>["pagination"];
  loading?: boolean;
  onPageChange: (page: number) => void;
}

const PayoutStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    [PayoutStatus.PENDING]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    [PayoutStatus.PROCESSING]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
    [PayoutStatus.COMPLETED]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
    [PayoutStatus.FAILED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  };

  const { bg, text, label } = config[status] || config[PayoutStatus.PENDING];

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
};

const PayoutMethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    [PayoutMethod.BANK_TRANSFER]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bank Transfer' },
    [PayoutMethod.PAYPAL]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'PayPal' },
  };

  const { bg, text, label } = config[method] || { bg: 'bg-gray-100', text: 'text-gray-700', label: method };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
};

export const PayoutsTable: React.FC<PayoutsTableProps> = ({
  payouts,
  pagination,
  loading,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const totalElements = pagination?.totalElements ?? payouts.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 0;
  const pageSize = pagination?.size ?? 10;

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
        <p className="text-sm text-gray-500">Your payout transactions</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!loading && payouts.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No payouts yet
            </h3>
            <p className="text-gray-600">
              Your payout history will appear here once payouts are processed.
            </p>
          </div>
        ) : (
          <>
          
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payout #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-gray-50"
                    >
                      {/* Payout # */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono">
                          {payout.payoutNumber}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatMoney(payout.totalAmount, payout.currency)}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 text-center">
                        <PayoutMethodBadge method={payout.paymentMethod} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <PayoutStatusBadge status={payout.status} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {formatDate(payout.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(TeacherRouteHelpers.payoutDetail(payout.id))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                          title="View payout details"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && pagination && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {currentPage * pageSize + 1} to{" "}
                  {Math.min(
                    (currentPage + 1) * pageSize,
                    totalElements || payouts.length
                  )}{" "}
                  of {totalElements} payouts
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
          </>
        )}
      </div>
    </>
  );
};
