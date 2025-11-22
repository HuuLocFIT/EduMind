import React, { forwardRef } from "react";
import { clsx } from "clsx";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, error, className, disabled, checked, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              ref={ref}
              type="checkbox"
              checked={checked}
              className="sr-only peer"
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? `${props.id}-error` : undefined}
              {...props}
            />
            <div
              className={clsx(
                "w-11 h-6 rounded-full transition-colors duration-200",
                "peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2",
                checked ? "bg-blue-600" : "bg-gray-300",
                disabled && "opacity-50 cursor-not-allowed",
                error && "ring-2 ring-red-500",
                className
              )}
            >
              <div
                className={clsx(
                  "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200",
                  checked && "transform translate-x-5"
                )}
              />
            </div>
          </label>

          {label && (
            <span
              className={clsx(
                "text-sm text-gray-700",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {label}
            </span>
          )}
        </div>

        {error && (
          <p id={`${props.id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = "Switch";
