import React from "react";
import { Modal } from "./Modal";
import { Button } from "../Button";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import clsx from "clsx";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconWrapperClass: "bg-red-50 ring-4 ring-red-100",
    iconClass: "text-red-600",
    confirmVariant: "danger" as const,
    confirmRingClass: "focus:ring-red-500",
  },
  warning: {
    icon: AlertTriangle,
    iconWrapperClass: "bg-yellow-50 ring-4 ring-yellow-100",
    iconClass: "text-yellow-600",
    confirmVariant: "primary" as const,
    confirmRingClass: "focus:ring-yellow-500",
  },
  info: {
    icon: Info,
    iconWrapperClass: "bg-blue-50 ring-4 ring-blue-100",
    iconClass: "text-blue-600",
    confirmVariant: "primary" as const,
    confirmRingClass: "focus:ring-blue-500",
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center px-2 pt-2 pb-6">
        {/* Icon */}
        <div
          className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center mb-5",
            config.iconWrapperClass
          )}
        >
          <Icon className={clsx("w-7 h-7", config.iconClass)} strokeWidth={1.75} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-2 pb-2">
        <Button
          variant="outline"
          fullWidth
          onClick={onClose}
          disabled={isLoading}
          className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-300"
        >
          {cancelText}
        </Button>
        <Button
          variant={config.confirmVariant}
          fullWidth
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
