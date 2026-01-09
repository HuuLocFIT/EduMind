import { Card, Button } from "@edumind/user-ui";
import { Clock, Users, BookOpen, ShoppingCart, Check, PlayCircle, Zap, Star } from "lucide-react";
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
  onEnrollFree?: (courseId: number) => void;
  isAddingToCart?: boolean;
  isEnrolling?: boolean;
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
  onEnrollFree,
  isAddingToCart = false,
  isEnrolling = false,
}) => {
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (isEnrolled && onGoToCourse) {
      onGoToCourse(course.id);
    } else if (isFree && onEnrollFree) {
      onEnrollFree(course.id);
    } else if (!isInCart && onAddToCart) {
      onAddToCart(course.id);
    }
  };

  const isFree = (course.effectivePrice ?? course.discountPrice ?? course.price) === 0;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 transform-gpu z-0 ${className}`}
    >
      {/* Course Thumbnail */}
      <div className="relative h-44 sm:h-48 lg:h-52 bg-gray-200 overflow-hidden rounded-t-2xl">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
          </div>
        )}
        
        {/* Badges Container - Right Side Top */}
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-white/90 backdrop-blur text-gray-800 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-gray-100/50">
            {course.level}
          </span>
        </div>

        {/* Enrolled Badge - Right Side Bottom (Overlay) */}
        {showActions && isEnrolled && (
          <div className="absolute bottom-3 right-3 z-10">
            <span className="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 font-bold animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              Enrolled
            </span>
          </div>
        )}

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
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span>-{Math.round(((course.price - course.discountPrice) / course.price) * 100)}%</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Course Info */}
      <div className="flex flex-col flex-grow p-4 sm:p-5">
        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 mb-1.5 line-clamp-2 min-h-[3.5rem] leading-snug group-hover:text-blue-600 transition-colors" title={course.title}>
          {course.title}
        </h3>

        {/* Instructor */}
        <p className="text-sm text-gray-500 mb-3 truncate flex items-center gap-1">
          <span>by</span>
          <span className="font-medium text-gray-700">{course.instructorName || "Instructor"}</span>
        </p>

        {/* Rating & Meta Row */}
        <div className="flex items-center text-sm text-gray-500 mb-5 gap-2">
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-extrabold text-gray-900 text-base">{course.averageRating?.toFixed(1) || "0.0"}</span>
            <span className="text-gray-500">({new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(course.totalReviews || 0)})</span>
          </div>

          <span className="text-gray-300 mx-1">•</span>

          {/* Students */}
          <div className="flex items-center gap-1.5" title="Students">
             <Users className="w-4 h-4 text-gray-400" />
             <span>{new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(course.totalStudents || 0)}</span>
          </div>

          <span className="text-gray-300 mx-1">•</span>

          {/* Duration */}
          <div className="flex items-center gap-1.5" title="Duration">
             <Clock className="w-4 h-4 text-gray-400" />
             <span>{course.durationHours || 0}h</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between gap-3">
          {/* Price Column (Left) */}
          <div className="flex flex-col">
             <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.effectivePrice ?? course.discountPrice ?? course.price)}
               </span>
               {course.discountPrice && course.discountPrice < course.price && (
                 <span className="text-sm text-gray-400 line-through font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.price)}
                 </span>
               )}
             </div>
             
             {/* Savings Text */}
             {course.discountPrice && course.discountPrice < course.price && (
               <span className="text-xs font-bold text-red-600 mt-1 bg-red-50 px-2 py-0.5 rounded-sm w-fit">
                  Save {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.price - course.discountPrice)}
               </span>
             )}
          </div>

          {/* Action Button (Right) */}
          {showActions && (
            <div className="flex-shrink-0">
              {isEnrolled ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleActionClick}
                  className="rounded-full px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  Continue
                </Button>
              ) : isInCart ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActionClick}
                  className="rounded-full px-5 py-2 border-green-500 text-green-600 bg-green-50 hover:bg-green-100 font-semibold text-sm transition-all"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Added
                </Button>
              ) : (
                <Button
                  variant={isFree ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleActionClick}
                  isLoading={isAddingToCart || isEnrolling}
                  className={`rounded-full px-5 py-2 font-semibold text-sm shadow-button hover:shadow-button-hover transition-all active:scale-95 ${
                    isFree 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  leftIcon={isFree ? <PlayCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                >
                  {isFree ? "Enroll Now" : "Add"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

