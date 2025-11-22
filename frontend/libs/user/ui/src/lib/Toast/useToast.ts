import { useState, useCallback } from "react";
import { ToastProps } from "./Toast";

export interface ToastOptions {
  variant?: ToastProps["variant"];
  title?: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastProps = {
      id,
      message,
      variant: options?.variant || "info",
      title: options?.title,
      duration: options?.duration || 5000,
      onClose: (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const success = useCallback(
    (message: string, title?: string) => {
      showToast(message, { variant: "success", title });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      showToast(message, { variant: "error", title });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      showToast(message, { variant: "warning", title });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      showToast(message, { variant: "info", title });
    },
    [showToast]
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    closeToast,
  };
};
