import React from "react";
import { WishlistItemResponse } from "@edumind/shared-types";
import { Button, Card, Loading, PriceTag, RatingStars } from "@edumind/user-ui";
import { BookOpen, ShoppingCart, Trash2 } from "lucide-react";

interface WishlistCardProps {
  item: WishlistItemResponse;
  onRemove: (courseId: number) => void;
  onEnroll: (courseId: number) => void;
  onViewCourse: () => void;
  isRemoving: boolean;
  isEnrolling: boolean;
}

export const WishlistCard: React.FC<WishlistCardProps> = ({
  item,
  onRemove,
  onEnroll,
  onViewCourse,
  isRemoving,
  isEnrolling,
}) => {
  const isFree = item.price === 0;

  return (
    <Card 
      className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden group"
      padding="none" // Ensure image touches edges
    >
      <div className="flex flex-col md:flex-row h-full relative">
        {/* Remove Button - Absolute Top Right */}
        <button
          onClick={(e) => {
             e.stopPropagation();
             onRemove(item.courseId);
          }}
          disabled={isRemoving}
          className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full shadow-sm transition-all"
          title="Remove from wishlist"
        >
          {isRemoving ? <Loading /> : <Trash2 className="w-5 h-5" />}
        </button>

        {/* Course Thumbnail */}
        <div
          className="w-full md:w-72 h-48 md:h-auto bg-gray-100 flex-shrink-0 relative cursor-pointer"
          onClick={onViewCourse}
        >
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.courseTitle}
              className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
             <div className="pr-10"> {/* Padding right for absolute delete button */}
                <h3
                  className="font-bold text-xl text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors mb-1"
                  onClick={onViewCourse}
                >
                  {item.courseTitle}
                </h3>
                <p className="text-gray-600 font-medium text-sm mb-2">{item.instructorName}</p>
             </div>

             <div className="flex items-center gap-4 mb-3">
                <RatingStars rating={item.rating || 0} size="sm" showNumber />
                <span className="text-sm text-gray-500 border-l pl-4 border-gray-300">
                  {item.reviewCount || 0} reviews
                </span>
             </div>

             <div className="mb-4">
               <PriceTag
                  price={item.discountPrice ?? item.price ?? 0}
                  originalPrice={item.discountPrice ? item.price : undefined}
                  size="lg"
                />
             </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 border-t border-gray-100 mt-auto">
             <div className="text-sm text-gray-500 flex items-center gap-2 mb-2 md:mb-0">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Added {new Date(item.addedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
             </div>

             <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={onViewCourse}
                  className="flex-1 md:flex-none"
                >
                  View Details
                </Button>

                <Button
                  variant="primary"
                  onClick={() => onEnroll(item.courseId)}
                  isLoading={isEnrolling}
                  className="flex-1 md:flex-none"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isFree ? "Enroll Free" : "Enroll Now"}
                </Button>
             </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
