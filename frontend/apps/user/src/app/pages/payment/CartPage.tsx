import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Button, Loading, PriceTag, ConfirmDialog, useToast } from "@edumind/user-ui";
import { useCart, useRemoveFromCart, useClearCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { CartItem } from "../../components/payment-module";
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useMemo } from "react";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

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
  const [coursePendingRemoval, setCoursePendingRemoval] = React.useState<number | null>(null);
  const [pendingRemovalFocus, setPendingRemovalFocus] = React.useState<{ courseId: number; index: number } | null>(null);
  const [removalAnnouncement, setRemovalAnnouncement] = React.useState("");
  const removalAnnouncementTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const itemListRef = React.useRef<HTMLUListElement>(null);

  // ScrollToTop handles client-side route changes but intentionally skips the
  // initial route. Focus here as well so a directly loaded cart page gives
  // keyboard and screen-reader users immediate page context.
  useEffect(() => {
    cartHeadingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => {
    if (removalAnnouncementTimerRef.current) {
      clearTimeout(removalAnnouncementTimerRef.current);
    }
  }, []);

  // Sync server data to local store
  useEffect(() => {
    if (cart) {
      setCart(cart.items, cart.totalAmount, cart.currency || "USD");
    }
  }, [cart, setCart]);

  const handleRemove = (courseId: number) => {
    setCoursePendingRemoval(courseId);
  };

  const confirmRemove = () => {
    const courseId = coursePendingRemoval;
    if (courseId === null) return;
    const removedIndex = items.findIndex((item) => item.courseId === courseId);
    const removedItem = items[removedIndex];
    if (!removedItem) return;
    const remainingItems = items.filter((item) => item.courseId !== courseId);
    const newTotal = remainingItems.reduce((sum, item) => sum + item.effectivePrice, 0);
    removeFromCart.mutate(courseId, {
      onSuccess: () => {
        setCoursePendingRemoval(null);
        const message = `${removedItem.courseTitle} removed from cart. New total: $${newTotal.toFixed(2)} ${currency}.`;
        // Keep the existing visible confirmation toast.
        showSuccess(message);

        // While the confirmation dialog runs its 300 ms exit transition,
        // Headless UI keeps the page behind it inert. Announcing immediately
        // would therefore be missed by VoiceOver. Update this stable live
        // region only after the dialog has left the accessibility tree.
        setRemovalAnnouncement("");
        if (removalAnnouncementTimerRef.current) {
          clearTimeout(removalAnnouncementTimerRef.current);
        }
        removalAnnouncementTimerRef.current = setTimeout(() => {
          setRemovalAnnouncement(message);
          removalAnnouncementTimerRef.current = null;
        }, 350);
        setPendingRemovalFocus({ courseId, index: removedIndex });
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

  const items = useMemo(() => cart?.items || [], [cart?.items]);
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discountTotal || 0;
  const totalAmount = cart?.totalAmount || 0;
  const currency = cart?.currency || "USD";

  // Check for unavailable items
  const unavailableItems = useMemo(
    () => items.filter((item) => item.isAvailable === false),
    [items]
  );
  const hasUnavailableItems = unavailableItems.length > 0;
  const availableItemsCount = items.length - unavailableItems.length;

  useEffect(() => {
    if (!pendingRemovalFocus || items.some((item) => item.courseId === pendingRemovalFocus.courseId)) return;

    const remaining = itemListRef.current?.querySelectorAll<HTMLElement>("[data-cart-item]");
    const targetIndex = Math.min(pendingRemovalFocus.index, Math.max((remaining?.length || 1) - 1, 0));
    const target = remaining?.[targetIndex];
    const focusTarget = target?.querySelector<HTMLElement>("a, button") || emptyHeadingRef.current || cartHeadingRef.current;
    focusTarget?.focus();
    setPendingRemovalFocus(null);
  }, [items, pendingRemovalFocus]);

  return (
    <>
      <SeoMetaTags
        title="Shopping Cart"
        description="Review the courses in your EduMind shopping cart and continue to secure checkout."
        canonicalUrl={USER_ROUTES.CART}
        noIndex
      />
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
                  <h1 ref={cartHeadingRef} tabIndex={-1} className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 truncate">
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
          {/* Loading State */}
          {isLoading && (
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loading />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-sm sm:text-base text-red-800">
                {(error as Error)?.message || "Failed to load cart"}
              </p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {/* Unavailable Items Warning */}
          {!isLoading && hasUnavailableItems && (
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
            <Card
              className="p-6 sm:p-12 text-center"
              role="region"
              aria-labelledby="empty-cart-heading"
            >
              <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h2 id="empty-cart-heading" ref={emptyHeadingRef} tabIndex={-1} className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Browse our courses and add them to your cart to get started
              </p>
              <Link to={USER_ROUTES.COURSES} aria-label="Browse Courses" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"><ArrowLeft className="w-4 h-4" aria-hidden="true" />Browse Courses</Link>
            </Card>
          )}

          {/* Cart Content */}
          {!isLoading && items.length > 0 && (
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Order Summary - Show first on mobile */}
              <div className="order-1 lg:order-2 lg:col-span-1">
                <Card
                  className="p-4 sm:p-6 lg:sticky lg:top-8"
                  role="region"
                  aria-labelledby="cart-order-summary-heading"
                >
                  <h2 id="cart-order-summary-heading" className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Order Summary
                  </h2>

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
                        <span className="font-medium text-green-700">
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
                    aria-describedby={hasUnavailableItems || availableItemsCount === 0 ? "checkout-disabled-reason" : undefined}
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
                  {(hasUnavailableItems || availableItemsCount === 0) && (
                    <p id="checkout-disabled-reason" className="mt-2 text-sm text-amber-800">
                      {hasUnavailableItems ? "Checkout is unavailable until all unavailable courses are removed." : "Checkout is unavailable because there are no available courses in your cart."}
                    </p>
                  )}

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
              <div className="order-2 lg:order-1 lg:col-span-2">
                <h2 id="cart-items-heading" className="sr-only">Courses in your cart</h2>
                <ul
                  ref={itemListRef}
                  aria-labelledby="cart-items-heading"
                  className="space-y-3 sm:space-y-4"
                >
                {items.map((item) => (
                  <CartItem
                    key={item.courseId}
                    item={item}
                    onRemove={handleRemove}
                    isRemoving={pendingRemovals.includes(item.courseId) || removeFromCart.isPending}
                  />
                ))}
                </ul>

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
        isOpen={coursePendingRemoval !== null}
        onClose={() => setCoursePendingRemoval(null)}
        onConfirm={confirmRemove}
        title="Remove course from cart"
        message={`Are you sure you want to remove ${items.find((item) => item.courseId === coursePendingRemoval)?.courseTitle || "this course"} from your cart?`}
        confirmText="Remove course"
        cancelText="Keep course"
        variant="danger"
        isLoading={removeFromCart.isPending}
      />
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
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {removalAnnouncement}
      </p>
    </>
  );
};

export default CartPage;
