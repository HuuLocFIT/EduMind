import React from "react";
import { DollarSign, Clock, Wallet, Hash } from "lucide-react";
import { Skeleton } from "@edumind/user-ui";
import type { PayoutSummaryResponse } from "@edumind/shared-types";

// Internal StatCard matches EarningsStats design
interface CardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: "indigo" | "green" | "yellow" | "blue";
}

const StatCard: React.FC<CardProps> = ({
  title,
  value,
  icon: Icon,
  color = "indigo",
}) => {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
};

interface PayoutSummaryCardsProps {
  summary?: PayoutSummaryResponse;
  loading: boolean;
}

export const PayoutSummaryCards: React.FC<PayoutSummaryCardsProps> = ({
  summary,
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
      currency: summary?.currency || "USD",
    }).format(amount || 0);
  };

  return (
    <>
      <StatCard
        title="Total Payouts"
        value={formatMoney(summary?.totalPayouts)}
        icon={DollarSign}
        color="indigo"
      />
      
      <StatCard
        title="Pending Payouts"
        value={formatMoney(summary?.pendingPayouts)}
        icon={Clock}
        color="yellow"
      />
      
      <StatCard
        title="Available for Payout"
        value={formatMoney(summary?.availableForPayout)}
        icon={Wallet}
        color="green"
      />
      
      <StatCard
        title="Total Payout Count"
        value={(summary?.totalPayoutCount || 0).toString()}
        icon={Hash}
        color="blue"
      />
    </>
  );
};
