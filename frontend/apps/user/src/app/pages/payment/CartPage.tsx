import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading, PriceTag, ConfirmDialog, useToast } from "@edumind/user-ui";
import { useCart, useRemoveFromCart, useClearCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { CartItem } from "../../components/payment-module";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useMemo } from "react";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  // Server state
  const { data: cart, isLoading, error, refetch } = useCart();

  // Local store for optimistic UI
  const { setCart, pendingRemovals, clearCart: clearLocalCart } = useCartStore();

  // Mutations
  const removeFromCart = useRemoveFromCart();
  const clearCartMutation = useClearCart();

  // Dialog state
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);

  // Sync server data to local store
  useEffect(() => {
    if (cart) {
      setCart(cart.items, cart.totalAmount, cart.currency || "USD");
    }
  }, [cart, setCart]);

  const handleRemove = (courseId: number) => {
    removeFromCart.mutate(courseId, {
      onSuccess: () => {
        showSuccess("Item removed from cart");
      },
      onError: (err: Error) => {
        showError(err.message || "Failed to remove item");
      },
    });
  };

  const handleClearAll = () => {
    clearCartMutation.mutate(undefined, {
      onSuccess: () => {
        clearLocalCart();
        setIsClearDialogOpen(false);
        showSuccess("Cart cleared");
      },
      onError: (err: Error) => {
        showError(err.message || "Failed to clear cart");
      },
    });
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      showError("Your cart is empty");
      return;
    }
    if (hasUnavailableItems) {
      showError("Please remove unavailable items before checkout");
      return;
    }
    navigate(USER_ROUTES.CHECKOUT);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discountTotal || 0;
  const totalAmount = cart?.totalAmount || 0;
  const currency = cart?.currency || "USD";

  // Check for unavailable items (FIX #15)
  const unavailableItems = useMemo(
    () => items.filter((item) => item.isAvailable === false),
    [items]
  );
  const hasUnavailableItems = unavailableItems.length > 0;
  const availableItemsCount = items.length - unavailableItems.length;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex-shrink-0">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 truncate">
                    Shopping Cart
                  </h1>
                  <p className="text-blue-100 text-sm md:text-lg">
                    {items.length} {items.length === 1 ? "course" : "courses"} in your cart
                  </p>
                </div>
              </div>

              {items.length > 0 && (
                <button
                  onClick={() => setIsClearDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear Cart</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-red-800">
                {(error as Error)?.message || "Failed to load cart"}
              </p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {/* Unavailable Items Warning (FIX #15) */}
          {hasUnavailableItems && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-amber-800">
                    {unavailableItems.length} {unavailableItems.length === 1 ? "item is" : "items are"} no longer available
                  </p>
                  <p className="text-xs sm:text-sm text-amber-700 mt-1">
                    Please remove unavailable items before proceeding to checkout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <Card className="p-6 sm:p-12 text-center">
              <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Browse our courses and add them to your cart to get started
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(USER_ROUTES.COURSES)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Browse Courses
              </Button>
            </Card>
          )}

          {/* Cart Content */}
          {items.length > 0 && (
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Order Summary - Show first on mobile */}
              <div className="order-1 lg:order-2 lg:col-span-1">
                <Card className="p-4 sm:p-6 lg:sticky lg:top-8">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Subtotal ({items.length} items):</span>
                      <span className="font-medium text-gray-900">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">
                          -${discount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 sm:pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-semibold text-gray-900">Total:</span>
                        <PriceTag price={totalAmount} size="lg" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{currency}</p>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    variant="primary"
                    onClick={handleCheckout}
                    disabled={hasUnavailableItems || availableItemsCount === 0}
                    className="w-full"
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {hasUnavailableItems ? (
                      "Remove unavailable items"
                    ) : (
                      <>
                        <span className="hidden sm:inline">Proceed to Checkout</span>
                        <span className="sm:hidden">Checkout</span>
                      </>
                    )}
                  </Button>

                  {/* Security Note */}
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">
                      🔒 Secure checkout powered by our payment partners
                    </p>
                  </div>

                  {/* Continue Shopping - Mobile only */}
                  <div className="mt-3 lg:hidden text-center">
                    <button
                      onClick={() => navigate(USER_ROUTES.COURSES)}
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      ← Continue Shopping
                    </button>
                  </div>
                </Card>
              </div>

              {/* Main Content - Cart Items */}
              <div className="order-2 lg:order-1 lg:col-span-2 space-y-3 sm:space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={item.courseId}
                    item={item}
                    onRemove={handleRemove}
                    isRemoving={pendingRemovals.includes(item.courseId) || removeFromCart.isPending}
                  />
                ))}

                {/* Continue Shopping - Desktop only */}
                <div className="hidden lg:block pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(USER_ROUTES.COURSES)}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear Cart Confirmation */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleClearAll}
        title="Clear shopping cart"
        message="Are you sure you want to remove all courses from your cart?"
        confirmText="Clear Cart"
        cancelText="Cancel"
        variant="danger"
        isLoading={clearCartMutation.isPending}
      />
    </>
  );
};

export default CartPage;
