import React from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { clsx } from "clsx";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "max-w-full mx-4",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        // Headless UI Dialog calls onClose for both Escape key and overlay click
        // with no API to separate the two triggers. Use OR logic:
        // if at least one prop allows closing, close the modal.
        if (closeOnOverlayClick || closeOnEscape) {
          onClose();
        }
      }}
      className="relative z-50"
    >
      {/* Backdrop — sibling to panel container as recommended by Headless UI */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
        aria-hidden="true"
      />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={clsx(
              "w-full transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0",
              "flex flex-col max-h-[calc(100vh-2rem)]",
              sizeStyles[size]
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
                {title && (
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {title}
                  </DialogTitle>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            )}
            <div className="pt-4 overflow-y-auto flex-1">{children}</div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
