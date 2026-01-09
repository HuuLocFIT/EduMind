import { Card, RatingStars, Button } from "@edumind/user-ui";
import { Clock, Users, BookOpen, ShoppingCart, Check, PlayCircle, Zap } from "lucide-react";
import type { CourseResponse } from "@edumind/shared-types";

interface CourseCardProps {
  course: CourseResponse;
  onClick?: () => void;
  className?: string;
  // New props for action buttons
  showActions?: boolean;
  isEnrolled?: boolean;
  isInCart?: boolean;
  onAddToCart?: (courseId: number) => void;
  onGoToCourse?: (courseId: number) => void;
  isAddingToCart?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onClick,
  className = "",
  showActions = false,
  isEnrolled = false,
  isInCart = false,
  onAddToCart,
  onGoToCourse,
  isAddingToCart = false,
}) => {
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (isEnrolled && onGoToCourse) {
      onGoToCourse(course.id);
    } else if (!isInCart && onAddToCart) {
      onAddToCart(course.id);
    }
  };

  const isFree = (course.effectivePrice ?? course.discountPrice ?? course.price) === 0;

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Course Thumbnail */}
      <div className="relative h-40 sm:h-44 lg:h-48 bg-gray-200 rounded-t-lg overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
          </div>
        )}
        
        {/* Badges Container - Right Side */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {/* Level Badge */}
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
            {course.level}
          </span>
          
          {/* Enrolled Badge */}
          {showActions && isEnrolled && (
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Check className="w-3 h-3" />
              Enrolled
            </span>
          )}
        </div>

        {/* Sales/Free Badge - Left Side (Ribbon Style) */}
        {isFree ? (
           <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-10 pointer-events-none">
             <div className="bg-green-500 text-white text-[10px] sm:text-xs font-bold py-1 w-32 text-center absolute top-[14px] -left-10 -rotate-45 shadow-sm transform origin-center">
              FREE
            </div>
          </div>
        ) : course.discountPrice && course.discountPrice < course.price ? (
          <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-10 pointer-events-none">
             <div className="bg-red-600 text-white text-[10px] sm:text-xs font-bold py-1 w-32 text-center absolute top-[14px] -left-10 -rotate-45 shadow-md flex items-center justify-center gap-0.5 sm:gap-1 transform origin-center">
              <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              <span>-{Math.round(((course.price - course.discountPrice) / course.price) * 100)}%</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Course Info */}
      <div className="flex flex-col flex-grow p-3 sm:p-4">
        {/* Title */}
        <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900 mb-1 sm:mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem]" title={course.title}>
          {course.title}
        </h3>

        {/* Instructor */}
        <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">
          {course.instructorName || "Instructor"}
        </p>

        {/* Rating */}
        <div className="flex items-center mb-2">
          <RatingStars
            rating={course.averageRating || 0}
            size="sm"
            showNumber
          />
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-gray-500">
            ({course.totalReviews || 0})
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{course.totalStudents || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{course.durationHours || 0}h</span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100">
          {/* Price - Custom Rendering */}
          <div className="mb-3 flex items-center flex-wrap gap-2">
             {/* Current Price */}
             <span className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.effectivePrice ?? course.discountPrice ?? course.price)}
             </span>
             
             {/* Original Price & Savings */}
             {course.discountPrice && course.discountPrice < course.price && (
               <>
                 <span className="text-sm text-gray-500 line-through">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.price)}
                 </span>
                 <span className="text-xs font-semibold text-green-600 ml-auto sm:ml-0">
                    Save {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.price - course.discountPrice)}
                 </span>
               </>
             )}
          </div>

          {/* Action Button - Full Width */}
          {showActions && (
            <div className="w-full">
              {isEnrolled ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleActionClick}
                  leftIcon={<PlayCircle className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Start Learning
                </Button>
              ) : isInCart ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActionClick} // Goes to cart
                  className="w-full justify-center bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Added to Cart
                </Button>
              ) : (
                <Button
                  variant="primary" // Changed to primary for better CTA
                  size="sm"
                  onClick={handleActionClick}
                  isLoading={isAddingToCart}
                  className="w-full justify-center"
                  leftIcon={!isAddingToCart ? <ShoppingCart className="w-4 h-4" /> : undefined}
                >
                  Add to Cart
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

