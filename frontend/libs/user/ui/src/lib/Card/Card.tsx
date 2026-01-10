import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variantStyles = {
  default: "bg-white border border-gray-200 shadow-sm",
  bordered: "bg-white border border-gray-200",
  elevated: "bg-white shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-xl",
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
