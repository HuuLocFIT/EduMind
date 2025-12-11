import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ToastProps } from "./Toast";

export interface ToastOptions {
  variant?: ToastProps["variant"];
  title?: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastProps[];
  showToast: (message: string, options?: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  closeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
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

  const value: ToastContextType = {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    closeToast,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

