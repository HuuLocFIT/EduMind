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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <Skeleton key={idx} className="h-14 rounded-lg" />
                ))}
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
