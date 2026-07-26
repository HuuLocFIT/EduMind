import React, { useState } from "react";
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
  setPage: (page: number) => void;
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
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 lg:hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <BrowseFilterSidebar {...sidebarProps} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <Button onClick={onApply} className="w-full" variant="primary">
            Apply Filters
          </Button>
          {sidebarProps.showClearButton && (
            <Button
              onClick={() => {
                sidebarProps.onClearFilters();
                onApply();
              }}
              className="w-full"
              variant="secondary"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
