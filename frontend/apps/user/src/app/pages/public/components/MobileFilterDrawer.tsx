import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@edumind/user-ui";
import { BrowseFilterSidebar } from "./BrowseFilterSidebar";
import type { CategoryResponse } from "@edumind/shared-types";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryResponse[];
  selectedCategoryIds: number[];
  onCategoryChange: (id: number) => void;
  selectedLevels: string[];
  onLevelChange: (level: string) => void;
  minPrice: string;
  maxPrice: string;
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
  minRating?: number;
  setMinRating: (rating: number | undefined) => void;
  filterType: "all" | "free";
  onFilterTypeChange?: (type: "all" | "free") => void;
  onClearFilters: () => void;
  showClearButton: boolean;
  onApply: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  ...sidebarProps
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState("");

  // Announce drawer open/close to screen readers
  useEffect(() => {
    setAnnouncement(isOpen ? "Filter panel opened. Use tab to navigate filters." : "Filter panel closed.");
  }, [isOpen]);

  // Auto-focus close button when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Trap focus & handle Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (!firstFocusable || !lastFocusable) return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            id="mobile-filter-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 lg:hidden flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 id="mobile-filter-title" className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close filters"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <BrowseFilterSidebar {...sidebarProps} showClearButton={false} idPrefix="mobile" />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              <Button id="mobile-apply-filters" onClick={onApply} className="w-full" variant="primary">
                Apply Filters
              </Button>
              {sidebarProps.showClearButton && (
                <Button
                  onClick={() => {
                    sidebarProps.onClearFilters();
                    requestAnimationFrame(() => document.getElementById("mobile-apply-filters")?.focus());
                  }}
                  className="w-full"
                  variant="secondary"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
