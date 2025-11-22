import React, { useEffect } from "react";
import { clsx } from "clsx";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const variantConfig = {
  info: {
    icon: Info,
    containerClass: "bg-blue-600",
    iconClass: "text-white",
  },
  success: {
    icon: CheckCircle,
    containerClass: "bg-green-600",
    iconClass: "text-white",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-yellow-600",
    iconClass: "text-white",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-red-600",
    iconClass: "text-white",
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  variant = "info",
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [id, duration, onClose]);

  return (
    <div
      className={clsx(
        "pointer-events-auto w-full max-w-sm rounded-lg shadow-lg",
        "animate-in slide-in-from-right duration-300",
        config.containerClass
      )}
      role="alert"
    >
      <div className="p-4 flex items-start gap-3">
        <Icon
          className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClass)}
        />

        <div className="flex-1 min-w-0 text-white">
          {title && <h4 className="text-sm font-semibold mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>

        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors text-white"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
