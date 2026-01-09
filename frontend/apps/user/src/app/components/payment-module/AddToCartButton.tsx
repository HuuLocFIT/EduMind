import React from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button, useToast } from "@edumind/user-ui";
import { useAddToCart, useIsInCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";

interface AddToCartButtonProps {
  courseId: number;
  isEnrolled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  courseId,
  isEnrolled = false,
  className = "",
  variant = "secondary",
  size = "md",
  fullWidth = false,
}) => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const { isAuthenticated } = useAuthStore();
  
  const { data: isInCart, isLoading: checkingCart } = useIsInCart(
    courseId,
    isAuthenticated
  );
  const addToCart = useAddToCart();
  const { startAddingItem, finishAddingItem, isItemInCart, isItemPending } = useCartStore();

  // Check local store for optimistic UI
  const inCartLocal = isItemInCart(courseId);
  const isPending = isItemPending(courseId);
  const isInCartFinal = inCartLocal || isInCart;

  // Don't show if already enrolled
  if (isEnrolled) {
    return null;
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showError("Please login to add courses to cart");
      navigate(USER_ROUTES.LOGIN);
      return;
    }

    if (isInCartFinal) {
      // Already in cart - navigate to cart
      navigate(USER_ROUTES.CART);
      return;
    }

    try {
      // Optimistic update
      startAddingItem(courseId);
      
      await addToCart.mutateAsync(courseId);
      showSuccess("Course added to cart!");
    } catch (error: any) {
      showError(error?.message || "Failed to add to cart");
    } finally {
      finishAddingItem(courseId);
    }
  };

  const isLoading = addToCart.isPending || isPending || checkingCart;

  if (isInCartFinal && !isPending) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => navigate(USER_ROUTES.CART)}
        className={`${fullWidth ? "w-full" : ""} ${className}`}
        leftIcon={<Check className="w-4 h-4" />}
      >
        In Cart
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleAddToCart}
      isLoading={isLoading}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      leftIcon={!isLoading ? <ShoppingCart className="w-4 h-4" /> : undefined}
    >
      Add to Cart
    </Button>
  );
};
