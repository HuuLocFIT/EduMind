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
      <Card className="hover:shadow-lg transition-shadow">
        <div className="flex gap-4 p-4">
          {/* Course Thumbnail */}
          <div
            className="w-40 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={onViewCourse}
          >
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.courseTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BookOpen className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
  
          {/* Course Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600"
              onClick={onViewCourse}
            >
              {item.courseTitle}
            </h3>
  
            <p className="text-sm text-gray-600 mb-2">
              {item.instructorName}
            </p>
  
            <div className="flex items-center gap-4 mb-3">
              <RatingStars rating={item.rating || 0} size="sm" showNumber />
              <span className="text-sm text-gray-500">
                ({item.reviewCount || 0} reviews)
              </span>
            </div>
  
            {/* Price */}
            <div className="mb-3">
              <PriceTag
                price={item.discountPrice ?? item.price ?? 0}
                originalPrice={item.discountPrice ? item.price : undefined}
                size="md"
              />
            </div>
  
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => onEnroll(item.courseId)}
                isLoading={isEnrolling}
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isFree ? 'Enroll Free' : 'Enroll Now'}
              </Button>
  
              <Button
                variant="secondary"
                onClick={onViewCourse}
                size="sm"
              >
                View Details
              </Button>
  
              <button
                onClick={() => onRemove(item.courseId)}
                disabled={isRemoving}
                className="ml-auto p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Remove from wishlist"
              >
                {isRemoving ? (
                  <Loading />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
  
        {/* Added Date */}
        <div className="px-4 pb-3 text-xs text-gray-500">
          Added {new Date(item.addedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </Card>
    );
  };