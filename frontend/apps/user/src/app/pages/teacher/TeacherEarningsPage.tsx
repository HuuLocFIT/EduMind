import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { earningService } from "../../services/earning.service";
import { EarningStatus } from "@edumind/shared-constants";
import { Button, Alert, useToast, Skeleton } from "@edumind/user-ui";
import { Download, Filter, Plus, Wallet } from "lucide-react";
import { EarningsStats } from "./earnings/components/EarningsStats";
import { EarningsTable } from "./earnings/components/EarningsTable";
import { EarningsChart } from "./earnings/components/EarningsChart";
import { TopCoursesCard } from "./earnings/components/TopCoursesCard";
import { DateRangeFilter } from "./earnings/components/DateRangeFilter";
import { TEACHER_ROUTES, downloadBlob } from "@edumind/shared-utils";
import { useNavigate } from "react-router-dom";

export const TeacherEarningsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  
  // State
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [statusFilter, setStatusFilter] = useState<EarningStatus | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<{ fromDate?: string; toDate?: string }>({});
  
  // Data Fetching - Summary (includes Top Courses)
  // Re-fetch when date range changes
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["teacher", "earnings", "summary", user?.id, dateRange],
    queryFn: () => earningService.getEarningsSummary({
       fromDate: dateRange.fromDate,
       toDate: dateRange.toDate
    }),
    enabled: !!user?.id,
  });

  // Data Fetching - Monthly History (Charts usually show fixed periods, e.g. last 12 months)
  // We keep this independent of the specific date range filter for now, 
  // unless we want to allow "custom range" for the chart buckets which is complex.
  const { data: monthlyData, isLoading: loadingMonthly } = useQuery({
    queryKey: ["teacher", "earnings", "monthly", user?.id],
    queryFn: () => earningService.getMonthlyEarnings(12),
    enabled: !!user?.id,
  });

  // Data Fetching - By Course
  const { data: byCourseData, isLoading: loadingByCourse } = useQuery({
    queryKey: ["teacher", "earnings", "by-course", user?.id, dateRange],
    queryFn: () => earningService.getEarningsByCourse({
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate
    }),
    enabled: !!user?.id,
  });

  // Data Fetching - List
  const { 
    data: earningsData, 
    isLoading: loadingList,
    error: listError
  } = useQuery({
    queryKey: ["teacher", "earnings", "list", user?.id, page, size, statusFilter, dateRange],
    queryFn: () => earningService.getMyEarnings({
      page,
      size,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      sortBy: "createdAt",
      sortOrder: "desc"
    }),
    enabled: !!user?.id,
  });

  // Export
  const handleExport = async () => {
    try {
      const blob = await earningService.exportEarningsCsv({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate
      });
      
      downloadBlob(blob, `earnings-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      showError("Failed to export earnings");
    }
  };

  const earnings = earningsData?.data || [];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-500 mt-1">
            Track your revenue and payouts
          </p>
        </div>

        <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(TEACHER_ROUTES.PAYOUTS)}
              leftIcon={<Wallet className="w-4 h-4" />}
            >
              View Payouts
            </Button>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <EarningsStats stats={summary} loading={loadingSummary} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           {/* Chart currently shows last 12 months always. 
               We could add a dropdown *in* the chart component to change duration if needed. */}
           <EarningsChart data={monthlyData || []} loading={loadingMonthly} />
        </div>
        <div className="lg:col-span-1">
           <TopCoursesCard courses={byCourseData || []} loading={loadingByCourse} />
        </div>
      </div>

      {/* Filters & Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               {/* Date Filter added here */}
               <DateRangeFilter 
                  fromDate={dateRange.fromDate}
                  toDate={dateRange.toDate}
                  onChange={setDateRange}
               />
               
               <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>

               <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                    value={statusFilter}
                    onChange={(e) => {
                    setStatusFilter(e.target.value as EarningStatus | "ALL");
                    setPage(0);
                    }}
                    className="text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
                >
                    <option value="ALL">All Status</option>
                    {Object.values(EarningStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                    ))}
                </select>
               </div>
             </div>

             <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                leftIcon={<Download className="w-4 h-4" />}
                disabled={!earnings.length}
              >
                Export
              </Button>
        </div>

        {listError && (
            <Alert 
              variant="error" 
              title="Error" 
              message="Failed to load earnings history" 
            />
        )}

        {loadingList ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            {[...Array(5)].map((_, idx) => (
              <Skeleton key={idx} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <EarningsTable 
            earnings={earnings} 
            pagination={earningsData?.pagination} 
            loading={loadingList}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherEarningsPage;
