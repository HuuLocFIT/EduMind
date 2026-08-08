import React, { forwardRef, useId } from "react";
import { clsx } from "clsx";

/* eslint-disable jsx-a11y/role-supports-aria-props -- aria-invalid exposes this native form control's validation state */

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, helperText, className, disabled, ...props }, ref) => {
    const generatedId = useId();
    const radioId = props.id || generatedId;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <input
            ref={ref}
            id={radioId}
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
            aria-describedby={[helperText ? `${radioId}-description` : null, error ? `${radioId}-error` : null].filter(Boolean).join(" ") || undefined}
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
        {helperText && <p id={`${radioId}-description`} className="text-sm text-gray-500 ml-6">{helperText}</p>}
      </div>
    );
  }
);

Radio.displayName = "Radio";
