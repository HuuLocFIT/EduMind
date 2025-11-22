import React from "react";
import { clsx } from "clsx";

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={clsx(
        "flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50",
        className
      )}
    >
      {children}
    </div>
  );
};
