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
  ariaLabel?: string;
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
  ariaLabel,
}) => {
  // Headless UI keeps the dialog mounted while its exit transition runs. The
  // caller may clear the selected item/message as soon as `isOpen` becomes
  // false, so keep rendering the last open content until the dialog unmounts.
  const visibleContentRef = React.useRef({ title, children });

  if (isOpen) {
    visibleContentRef.current = { title, children };
  }

  const visibleContent = visibleContentRef.current;

  return (
    <Dialog
      aria-label={!visibleContent.title ? ariaLabel ?? "Dialog" : undefined}
      open={isOpen}
      onClose={() => {
        // Headless UI Dialog calls onClose for both Escape key and overlay click
        // with no API to separate the two triggers. Use OR logic:
        // if at least one prop allows closing, close the modal.
        if (closeOnOverlayClick || closeOnEscape) {
          onClose();
        }
      }}
      // Headless UI places role="dialog" on this root. Give that semantic
      // element a real viewport-sized box; fixed descendants alone do not
      // contribute to their parent's layout box, so browser automation and
      // accessibility APIs can otherwise report an open dialog as hidden.
      className="fixed inset-0 z-50"
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
              // Keep the scale animation but never fade interactive content.
              // During an opacity transition, text and button colors composite
              // with the page and can temporarily fall below WCAG contrast.
              "w-full transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-transform duration-300 ease-out data-[closed]:scale-95",
              "flex flex-col max-h-[calc(100vh-2rem)]",
              sizeStyles[size]
            )}
          >
            {(visibleContent.title || showCloseButton) && (
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
                {visibleContent.title && (
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {visibleContent.title}
                  </DialogTitle>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Close modal"
                  >
                    <X aria-hidden="true" className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            )}
            {/* A shared content inset keeps the first control or illustration
                from crowding the header divider across every modal. */}
            <div className="overflow-y-auto flex-1 pt-4">
              {visibleContent.children}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
