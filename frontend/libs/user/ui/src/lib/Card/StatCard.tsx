import React from "react";
import { clsx } from "clsx";
import { Card } from "./Card";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down";
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className,
}) => {
  return (
    <Card variant="elevated" padding="md" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={clsx(
                  "text-sm font-medium",
                  change.trend === "up" ? "text-green-600" : "text-red-600"
                )}
              >
                {change.trend === "up" ? "↑" : "↓"} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>
          )}
        </div>

        {icon && (
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
