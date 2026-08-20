import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface AuthErrorSummaryProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  title?: string;
  message: ReactNode;
}

export const AuthErrorSummary = forwardRef<HTMLDivElement, AuthErrorSummaryProps>(
  ({ title = "Error", message, className, role = "alert", ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        role={role}
        tabIndex={-1}
        className={clsx(
          "rounded-lg border border-red-200 bg-red-50 p-4 focus:outline-none focus:ring-2 focus:ring-red-500",
          className,
        )}
      >
        <h2 className="text-sm font-semibold text-red-900">
          {title}
        </h2>
        <div className="text-sm text-red-700">
          {message}
        </div>
      </div>
    );
  },
);

AuthErrorSummary.displayName = "AuthErrorSummary";
