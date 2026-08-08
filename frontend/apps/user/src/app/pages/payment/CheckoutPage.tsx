import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, PriceTag, useToast } from "@edumind/user-ui";
import { CheckoutSkeleton } from "../../components/route-skeletons/CheckoutSkeleton";
import {
  useCheckoutPreview,
  useCheckout,
  useDirectCheckoutPreview,
  useDirectCheckout,
} from "../../hooks/useCheckout";
import { useCheckoutStore } from "../../stores/checkout.store";
import { useCartStore } from "../../stores/cart.store";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Wallet, ArrowLeft, ArrowRight, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { USER_ROUTES, UserRouteHelpers } from "@edumind/shared-utils";
import { PaymentMethod } from "@edumind/shared-constants";
import type { CheckoutRequest, DirectCheckoutRequest } from "@edumind/shared-types";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

// Generate a UUID v4 for idempotency key
const generateIdempotencyKey = (): string => {
  return crypto.randomUUID();
};

const accessibleUsdAmount = (amount: number): string =>
  `${amount.toFixed(2)} US dollars`;

const PAYMENT_REDIRECT_DELAY_MS = 3000;

const PAYMENT_METHODS = [
  {
    id: PaymentMethod.PAYPAL,
    name: "PayPal",
    description: "Pay securely with PayPal",
    icon: CreditCard,
  },
  {
    id: PaymentMethod.SEPAY,
    name: "SePay",
    description: "Pay with SePay gateway",
    icon: Wallet,
  },
] as const;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();

  const courseIdParam = searchParams.get("courseId");
  const directCourseId = courseIdParam ? Number(courseIdParam) : null;
  const isDirectCheckout = courseIdParam !== null;
  const hasValidDirectCourse = directCourseId !== null && Number.isInteger(directCourseId) && directCourseId > 0;
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const redirectStatusRef = useRef<HTMLParagraphElement>(null);
  const redirectTimeoutRef = useRef<number | null>(null);
  const submissionStartedRef = useRef(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  // Store state
  const {
    selectedPaymentMethod,
    setPaymentMethod,
    setStep,
    setResult,
    reset: resetCheckout,
  } = useCheckoutStore();
  const { clearCart } = useCartStore();

  // Server state - Cart Checkout
  const {
    data: cartPreview,
    isLoading: isCartLoading,
    error: cartError,
  } = useCheckoutPreview(!isDirectCheckout);
  const cartCheckoutMutation = useCheckout();

  // Server state - Direct Checkout
  const {
    data: directPreview,
    isLoading: isDirectLoading,
    error: directError,
  } = useDirectCheckoutPreview(
    hasValidDirectCourse ? directCourseId! : 0,
    isDirectCheckout && hasValidDirectCourse
  );
  const directCheckoutMutation = useDirectCheckout();

  // Derived state
  const preview = isDirectCheckout ? directPreview : cartPreview;
  const isLoading = isDirectCheckout ? isDirectLoading : isCartLoading;
  const error = isDirectCheckout ? directError : cartError;
  const hasCheckoutLoadError = !isLoading && Boolean(
    error || (isDirectCheckout && (
      !hasValidDirectCourse || !preview || preview.itemCount === 0
    ))
  );
  const isPending = isDirectCheckout
    ? directCheckoutMutation.isPending
    : cartCheckoutMutation.isPending;
  const directCourseSlug = directPreview?.items.find(
    (item) => item.courseId === directCourseId
  )?.courseSlug;
  const backRoute = isDirectCheckout
    ? directCourseSlug
      ? UserRouteHelpers.courseDetail(directCourseSlug)
      : USER_ROUTES.COURSES
    : USER_ROUTES.CART;

  // Reset checkout state on mount
  useEffect(() => {
    resetCheckout();
    setStep("payment");
  }, [resetCheckout, setStep]);

  useEffect(() => {
    if (checkoutError || hasCheckoutLoadError) errorHeadingRef.current?.focus();
  }, [checkoutError, hasCheckoutLoadError]);

  useEffect(() => {
    if (redirectMessage) redirectStatusRef.current?.focus();
  }, [redirectMessage]);

  useEffect(() => () => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
  }, []);

  // Redirect if cart is empty (Only in Cart mode)
  useEffect(() => {
    if (!isDirectCheckout && !isLoading && cartPreview && cartPreview.itemCount === 0) {
      navigate(USER_ROUTES.CART);
    }
  }, [isDirectCheckout, cartPreview, isLoading, navigate]);

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };

  const handleCheckout = async () => {
    if (submissionStartedRef.current || isPending) return;
    setCheckoutError(null);
    if (!selectedPaymentMethod) {
      setCheckoutError("Select a payment method before placing your order.");
      return;
    }

    if (!preview || preview.itemCount === 0) {
      setCheckoutError(isDirectCheckout
        ? "This course is unavailable for direct checkout. Return to Courses and choose a course again."
        : "Your cart has no items. Return to Cart or browse courses before checking out.");
      return;
    }

    submissionStartedRef.current = true;
    setStep("processing");

    // Generate idempotency key to prevent duplicate orders
    const idempotencyKey = generateIdempotencyKey();

    const baseRequest = {
      paymentMethod: selectedPaymentMethod,
      successUrl: `${window.location.origin}${USER_ROUTES.CHECKOUT_SUCCESS}`,
      cancelUrl: `${window.location.origin}${USER_ROUTES.CHECKOUT_FAILED}`,
      idempotencyKey,
    };

    try {
      let result;

      if (isDirectCheckout && directCourseId) {
        const directRequest: DirectCheckoutRequest = {
          courseId: directCourseId,
          ...baseRequest,
        };
        result = await directCheckoutMutation.mutateAsync(directRequest);
      } else {
        // Include cart signature from preview for validation
        const cartRequest: CheckoutRequest = {
          ...baseRequest,
          cartSignature: cartPreview?.cartSignature,
        };
        result = await cartCheckoutMutation.mutateAsync(cartRequest);
      }

      // Check for redirect FIRST (PayPal returns success=false, pending=true, requiresRedirect=true)
      // This must be checked before the success check to handle external payment redirects
      if (result.requiresRedirect && result.redirectUrl) {
        const redirectUrl = result.redirectUrl;
        setResult({
          orderNumber: result.orderNumber || undefined,
          redirectUrl,
        });

        // For SePay, redirect to our QR display page instead of directly to the QR image
        if (selectedPaymentMethod === PaymentMethod.SEPAY) {
          // Use localAmount (VND) if available, otherwise fallback to totalAmount
          const displayAmount = result.localAmount ?? result.totalAmount;
          const displayCurrency = result.localCurrency ?? result.currency ?? 'VND';

          const qrPageParams = new URLSearchParams({
            qrUrl: redirectUrl,
            orderId: String(result.orderId || ''),
            orderNumber: result.orderNumber || '',
            amount: String(displayAmount || ''),
            currency: displayCurrency,
          });
          navigate(`${USER_ROUTES.CHECKOUT_SEPAY_QR}?${qrPageParams.toString()}`);
          return;
        }

        // For other providers (PayPal), redirect to external payment page
        setRedirectMessage("Your order is ready. You are now leaving EduMind for the secure payment provider.");
        // Focus the status and leave enough time for assistive technology to
        // announce that the next page belongs to an external provider.
        redirectTimeoutRef.current = window.setTimeout(
          () => window.location.assign(redirectUrl),
          PAYMENT_REDIRECT_DELAY_MS,
        );
        return; // Exit early - browser will navigate away
      }

      if (result.success) {
        setResult({
          orderNumber: result.orderNumber || undefined,
          redirectUrl: result.redirectUrl || undefined,
        });

        // Clear cart on success ONLY if it was a cart checkout
        // (Direct checkout doesn't affect cart items necessarily,
        // though the backend might have logic for it if duplicates exist)
        if (!isDirectCheckout) {
          clearCart();
        }

        // Go to success page for immediate success (Mock gateway, free checkout)
        navigate(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=${result.orderNumber}`);
      } else {
        // Actual payment failure (not a pending redirect)
        setStep("failed");
        setResult({ errorMessage: result.message || "Payment failed" });
        navigate(
          `${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(
            result.message || "Payment failed"
          )}`
        );
      }
    } catch (err: any) {
      const errorCode = err.errorCode || err.response?.data?.errorCode;
      const errorMessage = err.message || err.response?.data?.message || "Checkout failed";
      const orderId = err.orderId || err.response?.data?.orderId;

      // Handle specific error codes from backend
      switch (errorCode) {
        case "CART_CHANGED":
          // Cart was modified between preview and checkout - refresh preview
          showError("Your cart was updated. Please review and try again.");
          setStep("payment");
          submissionStartedRef.current = false;
          setCheckoutError("Your cart was updated. Review the order summary and try again.");
          // Invalidate preview to force refetch
          queryClient.invalidateQueries({ queryKey: ["checkout", "preview"] });
          return;

        case "ORDER_EXPIRED":
          showError("This order has expired. Please start a new checkout.");
          navigate(USER_ROUTES.CART);
          return;

        case "CHECKOUT_IN_PROGRESS":
          showError("You have an active order in progress. Please complete or cancel it first.");
          // Navigate to existing order if orderId is provided
          if (orderId) {
            navigate(`${USER_ROUTES.ORDERS}/${orderId}`);
          }
          return;

        case "RETRY_LIMIT_EXCEEDED":
          showError("Maximum payment attempts reached. Please start a new order.");
          navigate(`${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(errorMessage)}&errorCode=${errorCode}`);
          return;

        default:
          setStep("failed");
          showError(errorMessage);
          navigate(
            `${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(errorMessage)}${errorCode ? `&errorCode=${errorCode}` : ""}`
          );
      }
    }
  };

  // Loading state
  if (isLoading) {
    return <div role="status" aria-label="Loading checkout"><span className="sr-only">Loading checkout details…</span><CheckoutSkeleton /></div>;
  }

  // Error state
  if (hasCheckoutLoadError) {
    const loadError = isDirectCheckout && !hasValidDirectCourse
      ? "The direct checkout link does not include a valid course."
      : isDirectCheckout && (!preview || preview.itemCount === 0)
        ? "This course is unavailable for direct checkout. Choose another course to continue."
      : (error as Error)?.message || "Unable to load checkout";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center" role="alert">
          <div className="text-red-500 mb-4">
            <Lock aria-hidden="true" className="w-12 h-12 mx-auto" />
          </div>
          <h1 ref={errorHeadingRef} tabIndex={-1} className="text-xl font-semibold text-gray-900 mb-2">
            Checkout Error
          </h1>
          <p className="text-gray-600 mb-4">
            {loadError}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(isDirectCheckout ? USER_ROUTES.COURSES : USER_ROUTES.CART)}
          >
            Return to {isDirectCheckout ? "Courses" : "Cart"}
          </Button>
        </Card>
      </div>
    );
  }

  const items = preview?.items || [];
  const subtotal = preview?.subtotal || 0;
  const discount = preview?.discountTotal || 0;
  const tax = (preview as any)?.taxAmount || 0;
  const total = preview?.totalAmount || 0;

  return (
    <>
      <SeoMetaTags
        title="Checkout"
        description="Review your order and choose a secure payment method."
        canonicalUrl={USER_ROUTES.CHECKOUT}
        noIndex
      />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back Button - Icon only on mobile */}
            <button
              onClick={() => navigate(backRoute)}
              aria-label={`Back to ${isDirectCheckout ? "course" : "cart"}`}
              className="flex items-center justify-center w-11 h-11 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4 text-white" />
              <span className="hidden sm:inline ml-1.5 text-sm font-medium" aria-hidden="true">
                Back to {isDirectCheckout ? "course" : "cart"}
              </span>
            </button>

            <h1 className="flex-1 text-lg sm:text-xl lg:text-2xl font-bold">
              {isDirectCheckout ? "Buy Now" : "Checkout"}
            </h1>

            {/* Secure Badge - Visible on all devices */}
            <div className="flex items-center gap-1.5 text-blue-100">
              <ShieldCheck aria-hidden="true" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Order Summary - Show FIRST on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            {/* Warnings Banner */}
            {preview?.warnings && preview.warnings.length > 0 && (
              <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 text-sm mb-1">Warnings</h4>
                    <ul className="list-disc list-inside text-amber-700 text-sm space-y-1">
                      {preview.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <Card
              className="p-4 sm:p-6 lg:sticky lg:top-8"
              role="region"
              aria-labelledby="order-summary-heading"
            >
              <h2 id="order-summary-heading" className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Order Summary
              </h2>

              <dl className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="text-gray-900">
                    <span aria-hidden="true">${subtotal.toFixed(2)} USD</span>
                    <span className="sr-only">{accessibleUsdAmount(subtotal)}</span>
                  </dd>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <dt className="text-gray-600">Discount</dt>
                    <dd className="text-green-700">
                      <span aria-hidden="true">-${discount.toFixed(2)} USD</span>
                      <span className="sr-only">Minus {accessibleUsdAmount(discount)}</span>
                    </dd>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <dt className="text-gray-600">Tax</dt>
                    <dd className="text-gray-900">
                      <span aria-hidden="true">${tax.toFixed(2)} USD</span>
                      <span className="sr-only">{accessibleUsdAmount(tax)}</span>
                    </dd>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 sm:pt-3 border-t">
                  <dt className="text-sm sm:text-base font-semibold text-gray-900">Total</dt>
                  <dd>
                    <span aria-hidden="true"><PriceTag price={total} size="lg" /></span>
                    <span className="sr-only">{accessibleUsdAmount(total)}</span>
                  </dd>
                </div>
              </dl>

              {checkoutError && (
                <div role="alert" className="mb-4 text-sm text-red-700">
                  <h2 ref={errorHeadingRef} tabIndex={-1} className="font-semibold">Unable to place order</h2>
                  <p>{checkoutError}</p>
                  {isDirectCheckout && <button type="button" className="underline" onClick={() => navigate(USER_ROUTES.COURSES)}>Browse courses</button>}
                </div>
              )}
              <p
                id="checkout-redirect-status"
                ref={redirectStatusRef}
                role="status"
                aria-live="assertive"
                aria-atomic="true"
                tabIndex={-1}
                className={redirectMessage ? "mb-4 text-sm text-gray-700" : "sr-only"}
              >
                {redirectMessage}
              </p>

              {/* Complete Order Button - Mobile visible */}
              <Button
                variant="primary"
                onClick={handleCheckout}
                disabled={isPending || submissionStartedRef.current}
                aria-disabled={isPending || submissionStartedRef.current}
                aria-describedby={redirectMessage ? "checkout-redirect-status" : undefined}
                isLoading={isPending}
                className="w-full"
                size="lg"
                rightIcon={<ArrowRight aria-hidden="true" focusable="false" className="w-4 h-4" />}
              >
                {isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <span className="hidden sm:inline">Complete Order</span>
                    <span className="sm:hidden">Pay Now</span>
                  </>
                )}
              </Button>

              {/* Security Badges */}
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-0 sm:flex-col sm:space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Lock aria-hidden="true" focusable="false" className="w-3 h-3" />
                  <span>SSL encrypted</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck aria-hidden="true" focusable="false" className="w-3 h-3" />
                  <span>30-day guarantee</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content - Order Items & Payment Methods */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Payment Method Selection - Show before items on mobile for faster checkout */}
            <Card className="p-4 sm:p-6">
              <h2 id="payment-method-heading" className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Method</h2>
              <fieldset aria-labelledby="payment-method-heading">
              <legend className="sr-only">Choose a payment method</legend>
              <div className="space-y-2 sm:space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPaymentMethod === method.id;

                  return (
                    <label
                      key={method.id}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input className="h-5 w-5 flex-shrink-0" type="radio" name="paymentMethod" value={method.id}
                        checked={isSelected} onChange={() => handleSelectPaymentMethod(method.id)} />
                      <div aria-hidden="true"
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900">
                          {method.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {method.description}
                        </p>
                      </div>
                      {isSelected && <span className="text-sm font-semibold">Selected</span>}
                    </label>
                  );
                })}
              </div>
              </fieldset>
            </Card>

            {/* Order Items Preview - Collapsible on mobile */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Order Items ({items.length})
              </h2>
              <ul className="space-y-2 sm:space-y-3">
                {items.map((item) => (
                  <li
                    key={item.courseId}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-12 h-9 sm:w-16 sm:h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                      {item.courseThumbnailUrl ? (
                        <img
                          src={item.courseThumbnailUrl}
                          alt={item.courseTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {item.courseTitle}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {item.instructorName}
                      </p>
                    </div>
                    <PriceTag
                      price={item.effectivePrice}
                      originalPrice={
                        item.discountAmount ? item.originalPrice : undefined
                      }
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default CheckoutPage;
