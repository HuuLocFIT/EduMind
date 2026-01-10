import React from "react";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PriceTag } from "@edumind/user-ui";
import type { CartItemResponse } from "@edumind/shared-types";
import { UserRouteHelpers } from "@edumind/shared-utils";

interface CartItemProps {
  item: CartItemResponse;
  onRemove: (courseId: number) => void;
  isRemoving?: boolean;
  compact?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onRemove,
  isRemoving = false,
  compact = false,
}) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(item.courseId);
  };

  if (compact) {
    return (
      <div className={`flex gap-3 p-3 bg-white rounded-lg ${isRemoving ? "opacity-50" : ""}`}>
        {/* Thumbnail */}
        <Link 
          to={UserRouteHelpers.courseDetail(item.courseId)}
          className="flex-shrink-0"
        >
          <div className="w-16 h-12 rounded overflow-hidden bg-gray-200">
            {item.courseThumbnailUrl ? (
              <img
                src={item.courseThumbnailUrl}
                alt={item.courseTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link 
            to={UserRouteHelpers.courseDetail(item.courseId)}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
          >
            {item.courseTitle}
          </Link>
          <p className="text-xs text-gray-500">{item.instructorName}</p>
        </div>

        {/* Price & Remove */}
        <div className="flex flex-col items-end gap-1">
          <PriceTag
            price={item.effectivePrice}
            originalPrice={item.discountAmount ? item.originalPrice : undefined}
            size="sm"
          />
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Remove from cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full size item (for cart page)
  return (
    <div className={`bg-white rounded-lg border ${isRemoving ? "opacity-50" : ""}`}>
      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
        {/* Thumbnail */}
        <Link 
          to={UserRouteHelpers.courseDetail(item.courseId)}
          className="flex-shrink-0"
        >
          <div className="w-20 h-14 sm:w-28 sm:h-20 lg:w-32 lg:h-24 rounded-lg overflow-hidden bg-gray-200">
            {item.courseThumbnailUrl ? (
              <img
                src={item.courseThumbnailUrl}
                alt={item.courseTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
            )}
          </div>
        </Link>

        {/* Content - takes remaining space */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title & Instructor */}
          <Link 
            to={UserRouteHelpers.courseDetail(item.courseId)}
            className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {item.courseTitle}
          </Link>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">By {item.instructorName}</p>
          
          {/* Meta info - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500">
            {item.level && (
              <span className="capitalize">{item.level.toLowerCase()}</span>
            )}
            {item.totalLessons && (
              <span>{item.totalLessons} lessons</span>
            )}
            {item.averageRating && (
              <span className="flex items-center gap-1">
                ⭐ {item.averageRating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Price & Remove - Mobile: inline, Desktop: right aligned */}
          <div className="flex items-center justify-between mt-2 sm:hidden">
            <PriceTag
              price={item.effectivePrice}
              originalPrice={item.discountAmount ? item.originalPrice : undefined}
              size="sm"
            />
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>

        {/* Price & Actions - Desktop only */}
        <div className="hidden sm:flex flex-col items-end justify-between flex-shrink-0">
          <PriceTag
            price={item.effectivePrice}
            originalPrice={item.discountAmount ? item.originalPrice : undefined}
            size="md"
          />
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
