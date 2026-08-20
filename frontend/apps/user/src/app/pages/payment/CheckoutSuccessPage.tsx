import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Loading } from "@edumind/user-ui";
import { CheckCircle, ArrowRight, BookOpen, Package, XCircle, RefreshCw, FileText, Clock } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCapturePayment, usePaymentStatus } from "../../hooks/useCheckout";
import type { CheckoutResultResponse } from "@edumind/shared-types";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

type PageState = "loading" | "pending" | "success" | "error";

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capturePaymentMutation = useCapturePayment();

  // PayPal returns ?token=ORDER_ID after user approval
  const token = searchParams.get("token");
  const rawOrderId = searchParams.get("orderId");
  const hasValidOrderId = rawOrderId !== null && /^\d+$/.test(rawOrderId) && Number(rawOrderId) > 0;
  const parsedOrderId = hasValidOrderId ? Number(rawOrderId) : null;

  const [pageState, setPageState] = useState<PageState>(token || hasValidOrderId ? "loading" : "error");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (rawOrderId !== null) return "The order ID in this link is invalid.";
    return "This payment link is missing the information needed to verify your order.";
  });
  const [captureResult, setCaptureResult] = useState<CheckoutResultResponse | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  // The status endpoint is the source of truth for direct/SePay success URLs.
  const { data: orderStatusData, isError: isOrderStatusError, error: orderStatusError } = usePaymentStatus(parsedOrderId, {
    enabled: !token && parsedOrderId !== null && parsedOrderId > 0,
    refetchInterval: false,
  });

  // Never trust URL parameters as proof of payment. Only a backend-confirmed
  // COMPLETED order may transition this page to success.
  useEffect(() => {
    if (token || parsedOrderId === null) return;

    if (isOrderStatusError) {
      setErrorMessage(orderStatusError instanceof Error ? orderStatusError.message : "We couldn't verify this payment.");
      setPageState("error");
      return;
    }

    if (!orderStatusData) return;

    setCaptureResult(orderStatusData);
    setOrderNumber(orderStatusData.orderNumber || null);

    if (orderStatusData.success && orderStatusData.orderStatus === "COMPLETED") {
      setPageState("success");
    } else if (orderStatusData.pending || ["PENDING", "PROCESSING"].includes(orderStatusData.orderStatus || "")) {
      setPageState("pending");
    } else {
      setErrorMessage(orderStatusData.message || orderStatusData.errorMessage || "This payment was not completed.");
      setPageState("error");
    }
  }, [token, parsedOrderId, orderStatusData, isOrderStatusError, orderStatusError]);

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

  // Move focus when capture completes so keyboard and screen-reader users do
  // not remain on a loading state that no longer exists.
  useEffect(() => {
    if (pageState !== "loading") {
      resultHeadingRef.current?.focus();
    }
  }, [pageState]);

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

  const pageMetadata = (
    <SeoMetaTags
      title="Payment Confirmation"
      description="View the confirmation status for your EduMind payment."
      canonicalUrl={USER_ROUTES.CHECKOUT_SUCCESS}
      noIndex
    />
  );

  // Loading state - capturing payment
  if (pageState === "loading") {
    return (
      <>
        {pageMetadata}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div role="status" aria-live="polite" aria-atomic="true">
            <Loading />
            <h1 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
              Completing Your Payment
            </h1>
            <p className="text-gray-600">
              {token
                ? "Please wait while we confirm your payment with PayPal..."
                : "Please wait while we verify your order with the payment provider..."}
            </p>
          </div>
        </Card>
        </div>
      </>
    );
  }

  if (pageState === "pending") {
    return (
      <>
        {pageMetadata}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" aria-hidden="true" />
          </div>
          <h1 ref={resultHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">
            Payment Is Being Confirmed
          </h1>
          <p role="status" className="text-gray-600 mb-6">
            We have not received final confirmation yet. Check your orders again shortly.
          </p>
          {orderNumber && <p className="text-sm text-gray-600 mb-6">Order Number: <span className="font-mono font-semibold">{orderNumber}</span></p>}
          <Button variant="primary" className="w-full" onClick={() => navigate(USER_ROUTES.ORDERS)}>
            View Orders
          </Button>
        </Card>
        </div>
      </>
    );
  }

  // Error state - capture failed
  if (pageState === "error") {
    return (
      <>
        {pageMetadata}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
          </div>

          <h1
            ref={resultHeadingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
          >
            Payment Failed
          </h1>
          <p role="status" className="text-gray-600 mb-6">
            {errorMessage || "We couldn't complete your payment. Please try again."}
          </p>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CHECKOUT)}
              leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
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
      </>
    );
  }

  // Success state
  return (
    <>
      {pageMetadata}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
        </div>

        {/* Title */}
        <h1
          ref={resultHeadingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
        >
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        {/* Order Number */}
        {orderNumber && (
          <dl className="bg-gray-50 rounded-lg p-4 mb-4">
            <dt className="text-sm text-gray-500">Order Number</dt>
            <dd className="text-lg font-mono font-semibold text-gray-900">{orderNumber}</dd>
          </dl>
        )}

        {/* Payment Amount - Show local currency for SePay VND payments */}
        {captureResult?.localAmount && captureResult?.localCurrency && (
          <dl className="bg-blue-50 rounded-lg p-4 mb-4">
            <dt className="text-sm text-blue-600">Amount Paid</dt>
            <dd className="text-lg font-semibold text-blue-900">
              {formatCurrency(captureResult.localAmount, captureResult.localCurrency)}
            </dd>
            {captureResult.totalAmount && captureResult.currency &&
             captureResult.currency !== captureResult.localCurrency && (
              <dd className="text-xs text-blue-600 mt-1">
                ({formatCurrency(captureResult.totalAmount, captureResult.currency)})
              </dd>
            )}
          </dl>
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
              <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Download Invoice ({captureResult.invoiceNumber})
            </a>
          ) : captureResult && !captureResult.invoiceNumber ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">
              <Clock className="w-4 h-4" aria-hidden="true" />
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
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
            Start Learning
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(USER_ROUTES.ORDERS)}
          >
            <Package className="w-4 h-4 mr-2" aria-hidden="true" />
            View Order Details
          </Button>
        </div>
      </Card>
      </div>
    </>
  );
};

export default CheckoutSuccessPage;
