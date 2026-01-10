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

// Define interface locally to avoid dependency issues
interface MonthlyEarning {
  month: number;
  monthName: string;
  year: number;
  netEarnings: number;
}

interface EarningsChartProps {
  data: MonthlyEarning[];
  loading?: boolean;
}

export const EarningsChart: React.FC<EarningsChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  // Handle empty data case
  if (!data || data.length === 0) {
      return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 h-[300px] flex items-center justify-center text-gray-400">
              No earnings data available
          </div>
      );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    name: item.monthName.substring(0, 3), // "January" -> "Jan"
    fullName: `${item.monthName} ${item.year}`,
    amount: item.netEarnings,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
          <p className="font-semibold text-gray-900">{payload[0].payload.fullName}</p>
          <p className="text-indigo-600 font-medium">
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Monthly Earnings
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
            <Bar 
              dataKey="amount" 
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="url(#colorGradient)" 
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
