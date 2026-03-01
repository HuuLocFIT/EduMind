import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Skeleton } from "@edumind/user-ui";
import type { EnrollmentStatusStat } from "@edumind/shared-types";

interface StudentEngagementChartProps {
  data?: EnrollmentStatusStat[];
  loading?: boolean;
}

const COLORS = {
  ACTIVE: "#6366f1",
  COMPLETED: "#10b981",
  DROPPED: "#ef4444",
  SUSPENDED: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  SUSPENDED: "Suspended",
};

export const StudentEngagementChart: React.FC<StudentEngagementChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 h-[300px] flex items-center justify-center text-gray-400">
        No enrollment status data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: COLORS[item.status as keyof typeof COLORS] || "#6b7280",
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-gray-600 font-medium">
            {payload[0].value} enrollments
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Student Engagement
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
