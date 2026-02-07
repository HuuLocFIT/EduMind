import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Loading } from "@edumind/user-ui";
import { CheckCircle, ArrowRight, BookOpen, Package, XCircle, RefreshCw, FileText, Clock } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCapturePayment, usePaymentStatus } from "../../hooks/useCheckout";
import type { CheckoutResultResponse } from "@edumind/shared-types";

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
  const [captureResult, setCaptureResult] = useState<CheckoutResultResponse | null>(null);

  const parsedOrderId = orderId ? Number(orderId) : null;

  // Fetch order status for SePay flow (orderId present, no token)
  // Uses a single fetch (no polling) to get invoice data
  const { data: orderStatusData } = usePaymentStatus(parsedOrderId, {
    enabled: !token && parsedOrderId !== null && parsedOrderId > 0,
    refetchInterval: false,
  });

  // Populate captureResult from order status (SePay flow)
  useEffect(() => {
    if (orderStatusData && !captureResult) {
      setCaptureResult(orderStatusData);
      if (orderStatusData.orderNumber) {
        setOrderNumber(orderStatusData.orderNumber);
      }
    }
  }, [orderStatusData, captureResult]);

  // Handle PayPal capture when token is present
  useEffect(() => {
    if (token && pageState === "loading") {
      capturePaymentMutation.mutate(token, {
        onSuccess: (result) => {
          if (result.success) {
            setOrderNumber(result.orderNumber || null);
            setCaptureResult(result);
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

  // Format currency with proper locale
  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return null;
    const currencyCode = currency || "USD";

    // Use Vietnamese locale for VND
    const locale = currencyCode === "VND" ? "vi-VN" : "en-US";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currencyCode === "VND" ? 0 : 2,
      maximumFractionDigits: currencyCode === "VND" ? 0 : 2,
    }).format(amount);
  };

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
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {orderNumber}
            </p>
          </div>
        )}

        {/* Payment Amount - Show local currency for SePay VND payments */}
        {captureResult?.localAmount && captureResult?.localCurrency && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-600">Amount Paid</p>
            <p className="text-lg font-semibold text-blue-900">
              {formatCurrency(captureResult.localAmount, captureResult.localCurrency)}
            </p>
            {captureResult.totalAmount && captureResult.currency &&
             captureResult.currency !== captureResult.localCurrency && (
              <p className="text-xs text-blue-600 mt-1">
                ({formatCurrency(captureResult.totalAmount, captureResult.currency)})
              </p>
            )}
          </div>
        )}

        {/* Invoice Section */}
        <div className="mb-6">
          {captureResult?.invoiceNumber && captureResult?.invoiceUrl ? (
            <a
              href={captureResult.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Download Invoice ({captureResult.invoiceNumber})
            </a>
          ) : captureResult && !captureResult.invoiceNumber ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Invoice will be generated shortly
            </div>
          ) : null}
        </div>

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
