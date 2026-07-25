import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Alert,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@edumind/user-ui";
import { Plus } from "lucide-react";
import { PayoutSummaryCards } from "./payouts/components/PayoutSummaryCards";
import { PayoutsTable } from "./payouts/components/PayoutsTable";
import { PaymentSettingsTab } from "./payouts/components/PaymentSettingsTab";
import { usePayouts, usePayoutSummary } from "../../hooks/usePayouts";
import { TEACHER_ROUTES } from "@edumind/shared-utils";

export const TeacherPayoutsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  // Data Fetching - Summary
  const {
    data: summary,
    isLoading: loadingSummary,
    error: summaryError,
  } = usePayoutSummary();

  // Data Fetching - List
  const {
    data: payoutsData,
    isLoading: loadingList,
    error: listError,
  } = usePayouts({
    page,
    size,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const payouts = payoutsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-gray-500 mt-1">
            View your payout history and summary
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Course
          </Button>
        </div>
      </div>

      <Tabs defaultValue="payouts">
        <TabsList>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="settings">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="payouts" className="space-y-4 pt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <PayoutSummaryCards summary={summary} loading={loadingSummary} />
          </div>

          {/* Table Section */}
          <div className="space-y-6">
            {summaryError && (
              <Alert
                variant="error"
                title="Error"
                message="Failed to load payout summary"
              />
            )}

            {listError && (
              <Alert
                variant="error"
                title="Error"
                message="Failed to load payout history"
              />
            )}

            {loadingList ? (
              <div className="space-y-4 animate-pulse">
                <div>
                  <div className="h-6 w-36 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payout #
                          </th>
                          <th className="w-1/6 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="w-1/6 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">
                              <div className="h-4 w-36 bg-gray-200 rounded" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="h-6 w-28 bg-gray-200 rounded-full mx-auto" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="h-6 w-20 bg-gray-200 rounded-full mx-auto" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-4 w-24 bg-gray-200 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-6 w-16 bg-gray-200 rounded" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <PayoutsTable
                  payouts={payouts}
                  pagination={payoutsData?.pagination}
                  loading={loadingList}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <PaymentSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherPayoutsPage;
