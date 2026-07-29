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
  const changeLabel = change
    ? `${change.trend === "up" ? "Increased" : "Decreased"} by ${Math.abs(change.value)}% vs last month`
    : "";

  return (
    <Card variant="elevated" padding="md" className={className}>
      <figure
        role="group"
        aria-label={`${title}: ${value}${change ? `, ${changeLabel}` : ""}`}
        className="flex items-start justify-between"
      >
        <div className="flex-1">
          <figcaption className="text-sm font-medium text-gray-600">{title}</figcaption>
          <p className="text-3xl font-bold text-gray-900 mt-2" aria-hidden="true">{value}</p>

          {change && (
            <div
              role="text"
              aria-label={changeLabel}
              className="flex items-center gap-1 mt-2"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "text-sm font-medium",
                  change.trend === "up" ? "text-green-700" : "text-red-600"
                )}
              >
                {change.trend === "up" ? "↑" : "↓"} {Math.abs(change.value)}%
              </span>
              <span aria-hidden="true" className="text-sm text-gray-500">vs last month</span>
            </div>
          )}
        </div>

        {icon && (
          <div aria-hidden="true" className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
      </figure>
    </Card>
  );
};
