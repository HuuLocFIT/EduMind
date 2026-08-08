import React, { forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, helperText, className, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = props.id || generatedId;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={clsx(
              "w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600",
              "focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
              "transition-all duration-200 cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-red-500",
              className
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={[helperText ? `${checkboxId}-description` : null, error ? `${checkboxId}-error` : null].filter(Boolean).join(" ") || undefined}
            {...props}
          />

          {label && (
            <label
              htmlFor={checkboxId}
              className={clsx(
                "text-sm text-gray-700 cursor-pointer select-none",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {label}
            </label>
          )}
        </div>

        {error && (
          <p id={`${checkboxId}-error`} className="text-sm text-red-600 ml-6">
            {error}
          </p>
        )}
        {helperText && <p id={`${checkboxId}-description`} className="text-sm text-gray-500 ml-6">{helperText}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
