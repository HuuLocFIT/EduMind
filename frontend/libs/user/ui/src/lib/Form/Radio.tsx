import React, { forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className, disabled, ...props }, ref) => {
    const radioId = props.id || useId();
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <input
            ref={ref}
            type="radio"
            className={clsx(
              "w-4 h-4 mt-0.5 border-gray-300 text-blue-600",
              "focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
              "transition-all duration-200 cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-red-500",
              className
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${radioId}-error` : undefined}
            {...props}
          />

          {label && (
            <label
              htmlFor={radioId}
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
          <p id={`${radioId}-error`} className="text-sm text-red-600 ml-6">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Radio.displayName = "Radio";
