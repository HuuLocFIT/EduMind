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
import type { RatingDistributionStat } from "@edumind/shared-types";

interface RatingDistributionChartProps {
  data?: RatingDistributionStat[];
  loading?: boolean;
}

const COLORS = {
  5: "#fbbf24",
  4: "#fcd34d",
  3: "#fde047",
  2: "#fef08a",
  1: "#fef3c7",
};

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 h-[300px] flex items-center justify-center text-gray-400">
        No rating data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: `${item.stars}★`,
    stars: item.stars,
    count: item.count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
          <p className="font-semibold text-gray-900">
            {payload[0].payload.name}
          </p>
          <p className="text-yellow-600 font-medium">
            {payload[0].value} reviews
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Rating Distribution
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.stars as keyof typeof COLORS] || "#fbbf24"}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
