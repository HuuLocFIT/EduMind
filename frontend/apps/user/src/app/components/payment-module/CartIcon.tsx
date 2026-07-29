import React from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartCount } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { USER_ROUTES } from "@edumind/shared-utils";

interface CartIconProps {
  showBadge?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CartIcon: React.FC<CartIconProps> = ({
  showBadge = true,
  onClick,
  className = "",
}) => {
  const { data: serverCount } = useCartCount();
  const localCount = useCartStore((state) => state.itemCount);
  
  // Use local count for optimistic UI, fall back to server count
  const count = localCount || serverCount || 0;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link
      to={USER_ROUTES.CART}
      onClick={handleClick}
      className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      aria-label="Shopping Cart"
    >
      <ShoppingCart className="w-5 h-5 text-gray-600" aria-hidden="true" />
      {showBadge && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};
