import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading, PriceTag, ConfirmDialog, useToast } from "@edumind/user-ui";
import { useCart, useRemoveFromCart, useClearCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { CartItem } from "../../components/payment-module";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";

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

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Shopping Cart
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {items.length} {items.length === 1 ? "course" : "courses"} in cart
                  </p>
                </div>
              </div>

              {items.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setIsClearDialogOpen(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Clear Cart
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                {(error as Error)?.message || "Failed to load cart"}
              </p>
              <Button variant="secondary" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && items.length === 0 && (
            <Card className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 mb-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={item.courseId}
                    item={item}
                    onRemove={handleRemove}
                    isRemoving={pendingRemovals.includes(item.courseId) || removeFromCart.isPending}
                  />
                ))}

                {/* Continue Shopping */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(USER_ROUTES.COURSES)}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>

              {/* Sidebar - Order Summary */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({items.length} items):</span>
                      <span className="font-medium text-gray-900">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">
                          -${discount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <PriceTag price={totalAmount} size="lg" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{currency}</p>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    variant="primary"
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Proceed to Checkout
                  </Button>

                  {/* Security Note */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">
                      🔒 Secure checkout powered by our payment partners
                    </p>
                  </div>
                </Card>
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
