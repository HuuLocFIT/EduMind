import React, { forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = props.id || generatedId;
    return (
      <div className={clsx("flex flex-col gap-1", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span aria-hidden="true" className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={clsx(
            "w-full px-4 py-2 border rounded-lg transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "bg-white appearance-none",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 hover:border-gray-400",
            disabled && "bg-gray-100 cursor-not-allowed opacity-60",
            className,
          )}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            [helperText ? `${selectId}-description` : null, error ? `${selectId}-error` : null]
              .filter(Boolean).join(" ") || undefined
          }
          {...props}
        >
          {children}
        </select>

        {error && (
          <p id={`${selectId}-error`} className="text-sm text-red-600">{error}</p>
        )}

        {helperText && (
          <p id={`${selectId}-description`} className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
