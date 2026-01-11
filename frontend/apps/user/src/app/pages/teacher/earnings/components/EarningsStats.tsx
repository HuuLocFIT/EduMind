import React from "react";
import { 
  DollarSign, 
  Clock, 
  Wallet, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Skeleton } from "@edumind/user-ui";
import type { EarningsSummaryResponse } from "@edumind/shared-types";

// Internal StatCard matches StudentsStats design
interface CardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "indigo" | "green" | "yellow" | "blue";
}

const StatCard: React.FC<CardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = "indigo" 
}) => {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <div className="flex items-end gap-2">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {trend && (
            <div className={`flex items-center text-xs mb-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span className="font-medium">{trendValue}</span>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EarningsStatsProps {
  stats?: EarningsSummaryResponse;
  loading: boolean;
}

export const EarningsStats: React.FC<EarningsStatsProps> = ({
  stats,
  loading,
}) => {
  if (loading) {
    return (
      <>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </>
    );
  }

  const formatMoney = (amount?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: stats?.currency || "USD",
    }).format(amount || 0);
  };

  const growth = stats?.monthOverMonthGrowthPercent || 0;
  const growthTrend = growth >= 0 ? "up" : "down";
  const growthLabel = `${Math.abs(growth).toFixed(1)}%`;

  return (
    <>
      <StatCard
        title="Total Earnings"
        value={formatMoney(stats?.totalNetEarnings)}
        icon={DollarSign}
        color="indigo"
        trend={growth !== 0 ? growthTrend : undefined}
        trendValue={growth !== 0 ? `${growthLabel}` : undefined}
      />
      
      <StatCard
        title="Pending Clearance"
        value={formatMoney(stats?.pendingEarnings)}
        icon={Clock}
        color="yellow"
      />
      
      <StatCard
        title="Available for Payout"
        value={formatMoney(stats?.availableEarnings)}
        icon={Wallet}
        color="green"
      />
      
      <StatCard
        title="Total Sales"
        value={(stats?.totalSales || 0).toString()}
        icon={TrendingUp}
        color="blue"
      />
    </>
  );
};
