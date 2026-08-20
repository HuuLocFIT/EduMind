import React from "react";

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  price,
  originalPrice,
  currency = "USD",
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const hasDiscount = Boolean(originalPrice && originalPrice > price);

  if (price === 0) {
    return (
      <div
        className={`font-bold text-green-700 ${sizeClasses[size]} ${className}`}
      >
        Free
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="sr-only">
        {hasDiscount
          ? `Original price ${formatPrice(originalPrice!)}, now ${formatPrice(price)}, you save ${discount}%`
          : `Current price ${formatPrice(price)}`}
      </span>
      <div className="contents" aria-hidden="true">
        <span className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
          {formatPrice(price)}
        </span>
        {hasDiscount && (
          <React.Fragment>
            <span className="text-gray-600 line-through text-sm">
              {formatPrice(originalPrice!)}
            </span>
            <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
              -{discount}%
            </span>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};
