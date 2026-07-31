import React from "react";
import { clsx } from "clsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
  secondary:
    "bg-gray-600 hover:bg-gray-700 text-white shadow-sm hover:shadow-md",
  outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  ghost: "text-blue-600 hover:bg-blue-50",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md",
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}) => {
  return (
    <button
      className={clsx(
        // Base styles
        "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        // Variant styles
        variantStyles[variant],
        // Size styles
        sizeStyles[size],
        // State styles
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
        fullWidth && "w-full",
        // Custom className
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel ?? (isLoading && typeof children === "string" ? children : undefined)}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            aria-hidden="true"
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
          <span role="status" className="sr-only">Loading</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
