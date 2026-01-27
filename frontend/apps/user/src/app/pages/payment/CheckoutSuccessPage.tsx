import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Loading } from "@edumind/user-ui";
import { CheckCircle, ArrowRight, BookOpen, Package, XCircle, RefreshCw } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCapturePayment } from "../../hooks/useCheckout";

type PageState = "loading" | "success" | "error";

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capturePaymentMutation = useCapturePayment();

  // PayPal returns ?token=ORDER_ID after user approval
  const token = searchParams.get("token");
  // Our backend may also send ?orderId=... for direct success
  const orderId = searchParams.get("orderId");
  // For non-redirect payments, order number is passed directly
  const orderNumberParam = searchParams.get("order");

  const [pageState, setPageState] = useState<PageState>(token ? "loading" : "success");
  const [orderNumber, setOrderNumber] = useState<string | null>(orderNumberParam);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle PayPal capture when token is present
  useEffect(() => {
    if (token && pageState === "loading") {
      capturePaymentMutation.mutate(token, {
        onSuccess: (result) => {
          if (result.success) {
            setOrderNumber(result.orderNumber || null);
            setPageState("success");
          } else {
            setErrorMessage(result.message || "Payment capture failed");
            setPageState("error");
          }
        },
        onError: (error) => {
          setErrorMessage(error.message || "Payment capture failed");
          setPageState("error");
        },
      });
    }
  }, [token, pageState]);

  // Loading state - capturing payment
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loading />
          <h2 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
            Completing Your Payment
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment with PayPal...
          </p>
        </Card>
      </div>
    );
  }

  // Error state - capture failed
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600 mb-6">
            {errorMessage || "We couldn't complete your payment. Please try again."}
          </p>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CHECKOUT)}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CART)}
            >
              Return to Cart
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        {/* Order Number */}
        {orderNumber && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {orderNumber}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-sm text-gray-600 mb-8 space-y-2">
          <p>A confirmation email has been sent to your email address</p>
          <p>You can now access your purchased courses</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate(USER_ROUTES.LEARNING)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Start Learning
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(USER_ROUTES.ORDERS)}
          >
            <Package className="w-4 h-4 mr-2" />
            View Order Details
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CheckoutSuccessPage;
