import React, { useEffect, useMemo } from "react";
import { X, ShoppingCart, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Loading, useToast } from "@edumind/user-ui";
import { useCart, useRemoveFromCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { CartItem } from "./CartItem";
import { USER_ROUTES } from "@edumind/shared-utils";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const { data: cart, isLoading } = useCart();
  const removeFromCart = useRemoveFromCart();
  const { setCart, pendingRemovals } = useCartStore();

  // Sync server data to local store
  useEffect(() => {
    if (cart) {
      setCart(cart.items, cart.totalAmount, cart.currency || "USD");
    }
  }, [cart, setCart]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleRemove = (courseId: number) => {
    removeFromCart.mutate(courseId);
  };

  const handleViewCart = () => {
    onClose();
    navigate(USER_ROUTES.CART);
  };

  if (!isOpen) return null;

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const currency = cart?.currency || "USD";

  // Check for unavailable items
  const unavailableItems = items.filter((item) => item.isAvailable === false);
  const hasUnavailableItems = unavailableItems.length > 0;

  const handleCheckout = () => {
    if (hasUnavailableItems) {
      showError("Please remove unavailable items before checkout");
      return;
    }
    onClose();
    navigate(USER_ROUTES.CHECKOUT);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Shopping Cart</h2>
            {items.length > 0 && (
              <span className="bg-blue-100 text-blue-600 text-sm font-medium px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loading />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">Your cart is empty</p>
              <p className="text-sm text-gray-500 mb-6">
                Browse courses and add them to your cart
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate(USER_ROUTES.COURSES);
                }}
              >
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem
                  key={item.courseId}
                  item={item}
                  onRemove={handleRemove}
                  isRemoving={pendingRemovals.includes(item.courseId)}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            {/* Unavailable Items Warning */}
            {hasUnavailableItems && (
              <div className="flex items-center gap-2 p-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs text-amber-700">
                  {unavailableItems.length} {unavailableItems.length === 1 ? "item" : "items"} unavailable
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Total:</span>
              <span className="text-2xl font-bold text-gray-900">
                ${totalAmount.toFixed(2)} {currency}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleCheckout}
                disabled={hasUnavailableItems}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {hasUnavailableItems ? "Remove unavailable items" : "Checkout"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleViewCart}
              >
                View Cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
