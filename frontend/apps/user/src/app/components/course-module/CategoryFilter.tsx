import React from "react";
import type { CategoryResponse } from "@edumind/shared-types";

interface CategoryFilterProps {
  categories: CategoryResponse[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  className = "",
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>

      {/* All Categories */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
          selectedCategoryId === null
            ? "bg-blue-600 text-white"
            : "hover:bg-gray-100 text-gray-700"
        }`}
      >
        All Categories
      </button>

      {/* Category List */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
            selectedCategoryId === category.id
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          {category.name}
          {category.courseCount && (
            <span className="ml-2 text-sm opacity-75">
              ({category.courseCount})
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
