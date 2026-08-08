import React, { useEffect, useMemo } from "react";
import { X, ShoppingCart, ArrowRight, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, Loading, useToast } from "@edumind/user-ui";
import { useCart, useRemoveFromCart } from "../../hooks/useCart";
import { useCartStore } from "../../stores/cart.store";
import { useFocusTrap } from "../../hooks/useFocusTrap";
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
  const [announcement, setAnnouncement] = React.useState("");
  const [pendingRemovalFocus, setPendingRemovalFocus] = React.useState<{ courseId: number; index: number } | null>(null);
  const [coursePendingRemoval, setCoursePendingRemoval] = React.useState<number | null>(null);
  const drawerHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const announcementTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync server data to local store
  useEffect(() => {
    if (cart) {
      setCart(cart.items, cart.totalAmount, cart.currency || "USD");
    }
  }, [cart, setCart]);

  // Suspend the parent trap while the nested dialog owns focus. Unlike
  // deactivation, suspension does not restore focus to the navigation.
  const drawerRef = useFocusTrap(isOpen, onClose, coursePendingRemoval !== null);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isOpen]);

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
        setAnnouncement("");
        if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
        // Headless UI keeps the dialog and the background inert during its
        // 300 ms exit transition. Announce only once that transition is over.
        announcementTimerRef.current = setTimeout(() => {
          setAnnouncement(message);
          announcementTimerRef.current = null;
        }, 350);
        setPendingRemovalFocus({ courseId, index: removedIndex });
      },
      onError: (error: Error) => showError(error.message || `Failed to remove ${removedItem.courseTitle}`),
    });
  };

  const handleViewCart = () => {
    onClose();
    navigate(USER_ROUTES.CART);
  };

  const items = useMemo(() => cart?.items || [], [cart?.items]);
  const totalAmount = cart?.totalAmount || 0;
  const currency = cart?.currency || "USD";

  // Check for unavailable items
  const unavailableItems = items.filter((item) => item.isAvailable === false);
  const hasUnavailableItems = unavailableItems.length > 0;

  useEffect(() => {
    if (!pendingRemovalFocus || items.some((item) => item.courseId === pendingRemovalFocus.courseId)) return;

    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      const remaining = drawerRef.current?.querySelectorAll<HTMLElement>("[data-cart-item]");
      const targetIndex = Math.min(pendingRemovalFocus.index, Math.max((remaining?.length || 1) - 1, 0));
      const target = remaining?.[targetIndex];
      const focusTarget = target?.querySelector<HTMLElement>("a, button") || emptyHeadingRef.current || drawerHeadingRef.current;
      focusTarget?.focus({ preventScroll: true });
      focusTimerRef.current = null;
    }, 350);
    setPendingRemovalFocus(null);
  }, [drawerRef, items, pendingRemovalFocus]);

  if (!isOpen) return null;

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
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Shopping Cart, ${items.length} ${items.length === 1 ? "item" : "items"}`}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart aria-hidden="true" className="w-5 h-5 text-blue-600" />
            <h2 id="cart-drawer-title" ref={drawerHeadingRef} tabIndex={-1} className="text-lg font-semibold">Shopping Cart</h2>
            {items.length > 0 && (
              <span aria-hidden="true" className="bg-blue-100 text-blue-600 text-sm font-medium px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close shopping cart"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
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
              <h3 ref={emptyHeadingRef} tabIndex={-1} className="text-gray-600 font-semibold mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-500 mb-6">
                Browse courses and add them to your cart
              </p>
              <Link to={USER_ROUTES.COURSES} onClick={onClose} className="inline-flex rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Browse Courses</Link>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Courses in your cart">
              {items.map((item) => (
                <CartItem
                  key={item.courseId}
                  item={item}
                  onRemove={handleRemove}
                  isRemoving={pendingRemovals.includes(item.courseId)}
                  compact
                />
              ))}
            </ul>
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
            {/* WebKit's text role makes the split visual spans one VoiceOver navigation stop. */}
            {/* eslint-disable jsx-a11y/aria-role */}
            <div
              className="flex items-center justify-between mb-4"
              role="text"
              aria-label={`Total ${totalAmount.toFixed(2)} ${currency === "USD" ? "US dollars" : currency}`}
            >
              <span aria-hidden="true" className="text-gray-600">Total:</span>
              <span aria-hidden="true" className="text-2xl font-bold text-gray-900">
                ${totalAmount.toFixed(2)} {currency}
              </span>
            </div>
            {/* eslint-enable jsx-a11y/aria-role */}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleCheckout}
                disabled={hasUnavailableItems}
                aria-describedby={hasUnavailableItems ? "cart-drawer-checkout-disabled-reason" : undefined}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {hasUnavailableItems ? "Remove unavailable items" : "Checkout"}
              </Button>
              {hasUnavailableItems && <p id="cart-drawer-checkout-disabled-reason" className="text-xs text-amber-800">Checkout is unavailable until all unavailable courses are removed.</p>}
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
        {/* Keep the live region inside the aria-modal drawer so VoiceOver does
            not treat it as background content. */}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      </div>
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
    </>
  );
};
