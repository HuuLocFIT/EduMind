import React from "react";
import { clsx } from "clsx";
import { ButtonSize, ButtonVariant, variantStyles } from "./Button";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  "aria-label": string; // Required for accessibility
}

export const IconButton: React.FC<IconButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  className,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        variantStyles[variant],
        sizeClasses[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};
