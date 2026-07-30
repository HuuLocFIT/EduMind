import React from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number; // 0-5
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  size = "md",
  showNumber = false,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < maxStars; i++) {
      if (i < fullStars) {
        // Full star
        stars.push(
          <Star
            key={i}
            className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        // Half star
        stars.push(
          <div key={i} className="relative">
            <Star className={`${sizeClasses[size]} text-gray-300`} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star
                className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
              />
            </div>
          </div>
        );
      } else {
        // Empty star
        stars.push(
          <Star key={i} className={`${sizeClasses[size]} text-gray-300`} />
        );
      }
    }
    return stars;
  };

  const label = `${rating.toFixed(1)} out of ${maxStars} stars`;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex items-center gap-1">
        {renderStars()}
      </div>
      {showNumber && (
        <span className="ml-1 text-sm text-gray-600" aria-hidden="true">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
