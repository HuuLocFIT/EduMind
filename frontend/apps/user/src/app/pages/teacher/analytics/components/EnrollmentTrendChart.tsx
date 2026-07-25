import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyStat } from "@edumind/shared-types";

interface EnrollmentTrendChartProps {
  data?: MonthlyStat[];
  loading?: boolean;
}

export const EnrollmentTrendChart: React.FC<EnrollmentTrendChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 animate-pulse">
        <div className="h-6 w-44 bg-gray-200 rounded mb-4 sm:mb-6" />
        <div className="h-[260px] sm:h-[300px] w-full bg-gray-50 rounded-lg border border-gray-100" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 h-[300px] flex items-center justify-center text-gray-400">
        No enrollment data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.month.substring(0, 3),
    fullName: item.month,
    count: item.count || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
          <p className="font-semibold text-gray-900">
            {payload[0].payload.fullName}
          </p>
          <p className="text-indigo-600 font-medium">
            {payload[0].value} enrollments
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
        Enrollment Trend
      </h3>
      <div className="h-[260px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              fillOpacity={1}
              fill="url(#colorEnrollment)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
