import React, { useState } from "react";
import { Heart } from "lucide-react";

interface WishlistButtonProps {
  courseId: number;
  isInWishlist: boolean;
  onToggle: (courseId: number) => Promise<void>;
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  courseId,
  isInWishlist,
  onToggle,
  className = "",
}) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    setLoading(true);
    try {
      await onToggle(courseId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
      aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={`w-6 h-6 transition-colors ${
          isInWishlist
            ? "fill-red-500 text-red-500"
            : "text-gray-400 hover:text-red-500"
        }`}
      />
    </button>
  );
};
