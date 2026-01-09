import React, { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Loading, PriceTag, useToast } from "@edumind/user-ui";
import { useCheckoutPreview, useCheckout } from "../../hooks/useCheckout";
import { useCheckoutStore } from "../../stores/checkout.store";
import { useCartStore } from "../../stores/cart.store";
import { CreditCard, Wallet, ArrowLeft, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { USER_ROUTES, UserRouteHelpers } from "@edumind/shared-utils";
import { PaymentMethod } from "@edumind/shared-constants";
import type { CheckoutRequest } from "@edumind/shared-types";

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
  const { success: showSuccess, error: showError } = useToast();

  // Store state
  const {
    selectedPaymentMethod,
    setPaymentMethod,
    setStep,
    setResult,
    reset: resetCheckout,
  } = useCheckoutStore();
  const { clearCart } = useCartStore();

  // Server state
  const { data: preview, isLoading, error } = useCheckoutPreview(true);
  const checkoutMutation = useCheckout();

  // Reset checkout state on mount
  useEffect(() => {
    resetCheckout();
    setStep("payment");
  }, [resetCheckout, setStep]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && preview && preview.itemCount === 0) {
      navigate(USER_ROUTES.CART);
    }
  }, [preview, isLoading, navigate]);

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };

  const handleCheckout = async () => {
    if (!selectedPaymentMethod) {
      showError("Please select a payment method");
      return;
    }

    if (!preview || preview.itemCount === 0) {
      showError("Your cart is empty");
      navigate(USER_ROUTES.CART);
      return;
    }

    setStep("processing");

    const request: CheckoutRequest = {
      paymentMethod: selectedPaymentMethod,
      successUrl: `${window.location.origin}${USER_ROUTES.CHECKOUT_SUCCESS}`,
      cancelUrl: `${window.location.origin}${USER_ROUTES.CHECKOUT_FAILED}`,
    };

    try {
      const result = await checkoutMutation.mutateAsync(request);

      if (result.success) {
        setResult({
          orderNumber: result.orderNumber || undefined,
          redirectUrl: result.redirectUrl || undefined,
        });

        // Clear cart on success
        clearCart();

        // If there's a redirect URL (external payment), go there
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          // Otherwise go to success page
          navigate(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=${result.orderNumber}`);
        }
      } else {
        setStep("failed");
        setResult({ errorMessage: result.message || "Payment failed" });
        navigate(`${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(result.message || "Payment failed")}`);
      }
    } catch (err: any) {
      setStep("failed");
      showError(err.message || "Checkout failed");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <Lock className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Checkout Error
          </h2>
          <p className="text-gray-600 mb-4">
            {(error as Error)?.message || "Unable to load checkout"}
          </p>
          <Button variant="primary" onClick={() => navigate(USER_ROUTES.CART)}>
            Return to Cart
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(USER_ROUTES.CART)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              size="sm"
            >
              Back to Cart
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Payment Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items Preview */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.courseId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-16 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
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
                      <p className="font-medium text-gray-900 truncate">
                        {item.courseTitle}
                      </p>
                      <p className="text-sm text-gray-500">{item.instructorName}</p>
                    </div>
                    <PriceTag
                      price={item.effectivePrice}
                      originalPrice={item.discountAmount ? item.originalPrice : undefined}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Method Selection */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPaymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      onClick={() => handleSelectPaymentMethod(method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">{method.name}</p>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-blue-600" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-green-600">-${discount.toFixed(2)}</span>
                  </div>
                )}
                
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <PriceTag price={total} size="lg" />
                  </div>
                </div>
              </div>

              {/* Complete Order Button */}
              <Button
                variant="primary"
                onClick={handleCheckout}
                disabled={!selectedPaymentMethod || checkoutMutation.isPending}
                isLoading={checkoutMutation.isPending}
                className="w-full"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {checkoutMutation.isPending ? "Processing..." : "Complete Order"}
              </Button>

              {/* Security Badges */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-3 h-3" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
