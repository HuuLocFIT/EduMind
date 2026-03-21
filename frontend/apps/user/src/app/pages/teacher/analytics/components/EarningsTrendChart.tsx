import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@edumind/user-ui";
import type { MonthlyStat } from "@edumind/shared-types";

interface EarningsTrendChartProps {
  data?: MonthlyStat[];
  loading?: boolean;
}

export const EarningsTrendChart: React.FC<EarningsTrendChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 h-[300px] flex items-center justify-center text-gray-400">
        No earnings data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.month.substring(0, 3),
    fullName: item.month,
    amount: item.amount ? Number(item.amount) : 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
          <p className="font-semibold text-gray-900">
            {payload[0].payload.fullName}
          </p>
          <p className="text-green-600 font-medium">
            ${payload[0].value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
        Earnings Trend
      </h3>
      <div className="h-[260px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="url(#colorEarningsGradient)"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="colorEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
