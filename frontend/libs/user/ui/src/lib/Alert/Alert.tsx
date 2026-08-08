import React from "react";
import { clsx } from "clsx";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const variantConfig = {
  info: {
    icon: Info,
    containerClass: "bg-blue-50 border-blue-200",
    iconClass: "text-blue-600",
    titleClass: "text-blue-900",
    messageClass: "text-blue-700",
  },
  success: {
    icon: CheckCircle,
    containerClass: "bg-green-50 border-green-200",
    iconClass: "text-green-600",
    titleClass: "text-green-900",
    messageClass: "text-green-700",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-yellow-50 border-yellow-200",
    iconClass: "text-yellow-600",
    titleClass: "text-yellow-900",
    messageClass: "text-yellow-700",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-red-50 border-red-200",
    iconClass: "text-red-600",
    titleClass: "text-red-900",
    messageClass: "text-red-700",
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  onClose,
  className,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "p-4 border rounded-lg flex items-start gap-3",
        config.containerClass,
        className
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClass)}
      />

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={clsx("text-sm font-semibold mb-1", config.titleClass)}>
            {title}
          </h4>
        )}
        <p className={clsx("text-sm", config.messageClass)}>{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={clsx(
            "flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors",
            config.iconClass
          )}
          aria-label="Close alert"
        >
          <X aria-hidden="true" className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
