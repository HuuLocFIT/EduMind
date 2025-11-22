import React from "react";
import { Modal } from "./Modal";
import { ModalFooter } from "./ModalFooter";
import { Button } from "../Button";
import { AlertTriangle } from "lucide-react";
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
    icon: AlertTriangle,
    iconClass: "text-red-600 bg-red-100",
    confirmVariant: "danger" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-yellow-600 bg-yellow-100",
    confirmVariant: "primary" as const,
  },
  info: {
    icon: AlertTriangle,
    iconClass: "text-blue-600 bg-blue-100",
    confirmVariant: "primary" as const,
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
      <div className="text-center">
        <div
          className={clsx(
            "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4",
            config.iconClass
          )}
        >
          <Icon className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>

      <ModalFooter className="mt-6 border-t-0 bg-transparent p-0">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={config.confirmVariant}
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
