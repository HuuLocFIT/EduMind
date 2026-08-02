import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Loading } from "@edumind/user-ui";
import {
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { usePaymentStatus, useCancelPayment, formatTimeRemaining, calculateTimeRemaining } from "../../hooks/useCheckout";

type PageState = "scanning" | "success" | "expired" | "error";

// Order expiration time in minutes (matches backend: 30 minutes)
const ORDER_EXPIRATION_MINUTES = 30;
// Fallback initial time before we get createdAt from backend
const INITIAL_FALLBACK_SECONDS = ORDER_EXPIRATION_MINUTES * 60;

export const SepayQrPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelPaymentMutation = useCancelPayment();

  // Get params from URL
  const qrUrl = searchParams.get("qrUrl");
  const orderIdParam = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const amount = searchParams.get("amount");
  const currency = searchParams.get("currency") || "VND";

  const orderId = orderIdParam ? Number(orderIdParam) : null;

  const [pageState, setPageState] = useState<PageState>("scanning");
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_FALLBACK_SECONDS);
  const [copied, setCopied] = useState(false);

  // Track order creation time from backend for accurate countdown
  const orderCreatedAtRef = useRef<string | null>(null);

  // Poll for payment status with expiration handling
  const { data: statusData, isError } = usePaymentStatus(orderId, {
    enabled: pageState === "scanning" && orderId !== null,
    refetchInterval: 3000, // Poll every 3 seconds
    onExpired: () => {
      setPageState("expired");
    },
  });

  // Handle status updates and sync createdAt for accurate timer
  useEffect(() => {
    if (statusData) {
      // Sync order createdAt from backend (only once)
      if (statusData.createdAt && !orderCreatedAtRef.current) {
        orderCreatedAtRef.current = statusData.createdAt;
        // Immediately update timer with accurate remaining time
        const remaining = calculateTimeRemaining(statusData.createdAt);
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          setPageState("expired");
          return;
        }
      }

      // Check for successful completion
      if (statusData.success && statusData.orderStatus === "COMPLETED") {
        setPageState("success");
        // Auto-redirect to success page after short delay
        setTimeout(() => {
          navigate(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=${statusData.orderNumber || orderNumber}&orderId=${statusData.orderId || orderId}`);
        }, 2000);
        return;
      }

      // Check for error states from backend
      if (statusData.errorCode) {
        switch (statusData.errorCode) {
          case "ORDER_EXPIRED":
          case "PAYMENT_EXPIRED":
            setPageState("expired");
            return;
          case "PAYMENT_FAILED":
          case "ORDER_CANCELLED":
          case "ORDER_REFUNDED":
            // Redirect to failed page with error info
            navigate(
              `${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(statusData.message || "Payment failed")}&errorCode=${statusData.errorCode}`
            );
            return;
        }
      }

      // Check for terminal failure states
      if (statusData.orderStatus === "FAILED" || statusData.orderStatus === "CANCELLED") {
        navigate(
          `${USER_ROUTES.CHECKOUT_FAILED}?error=${encodeURIComponent(statusData.message || "Payment was not completed")}&errorCode=${statusData.errorCode || ""}`
        );
      }
    }
  }, [statusData, navigate, orderNumber]);

  // Handle polling errors
  useEffect(() => {
    if (isError) {
      // Don't immediately fail - could be temporary network issue
      console.error("Error checking payment status");
    }
  }, [isError]);

  // Countdown timer - uses backend createdAt when available for accuracy
  useEffect(() => {
    if (pageState !== "scanning") return;

    const timer = setInterval(() => {
      // If we have createdAt from backend, calculate from that for accuracy
      if (orderCreatedAtRef.current) {
        const remaining = calculateTimeRemaining(orderCreatedAtRef.current);
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          setPageState("expired");
        }
      } else {
        // Fallback: decrement local counter until we get backend data
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setPageState("expired");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pageState]);

  // Use formatTimeRemaining from hooks for consistency
  const formatTime = formatTimeRemaining;

  // Format amount with thousand separators
  const formatAmount = (value: string | null) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const accessibleAmount = (() => {
    if (!amount) return "Amount unavailable";
    const numericAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numericAmount)) return "Amount unavailable";

    const currencyName = currency === "VND" ? "Vietnamese dong" : currency;
    return `Amount: ${new Intl.NumberFormat("en-US").format(numericAmount)} ${currencyName}`;
  })();

  // Copy order number to clipboard
  const handleCopyOrderNumber = useCallback(() => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [orderNumber]);

  // Handle cancel
  const handleCancel = () => {
    if (orderId) {
      cancelPaymentMutation.mutate(orderId);
    }
    navigate(`${USER_ROUTES.CHECKOUT_FAILED}?orderId=${orderId}`);
  };

  // Handle retry (go back to checkout)
  const handleRetry = () => {
    navigate(USER_ROUTES.CHECKOUT);
  };

  // Validate required params
  if (!qrUrl || !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle aria-hidden="true" focusable="false" className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Payment Session</h1>
          <p className="text-gray-600 mb-6">
            The payment session is invalid or has expired. Please start a new checkout.
          </p>
          <Button variant="primary" className="w-full" onClick={handleRetry}>
            Return to Checkout
          </Button>
        </Card>
      </div>
    );
  }

  // Success state - brief confirmation before redirect
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle aria-hidden="true" focusable="false" className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h1>
          <p className="text-gray-600 mb-4">
            Your payment has been confirmed. Redirecting to order details...
          </p>
          <Loading />
        </Card>
      </div>
    );
  }

  // Expired state
  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock aria-hidden="true" focusable="false" className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code Expired</h1>
          <p className="text-gray-600 mb-6">
            The QR code has expired. Please start a new checkout to generate a fresh QR code.
          </p>
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleRetry}
              leftIcon={<RefreshCw aria-hidden="true" focusable="false" className="w-4 h-4" />}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CART)}
              leftIcon={<ArrowLeft aria-hidden="true" focusable="false" className="w-4 h-4" />}
            >
              Return to Cart
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Main scanning state - show QR code
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode aria-hidden="true" focusable="false" className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan to Pay with SePay</h1>
          <p className="text-gray-600">
            Use your banking app to scan the QR code and complete the payment
          </p>
        </div>

        {/* QR Code Card */}
        <Card className="p-6 mb-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock aria-hidden="true" focusable="false" className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600">Time remaining:</span>
            <span
              className={`font-mono font-bold text-lg ${
                timeRemaining < 60 ? "text-red-600" : "text-blue-600"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* QR Code Image */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-6">
            <img
              src={qrUrl}
              alt=""
              aria-hidden="true"
              className="w-full max-w-[280px] mx-auto aspect-square object-contain"
              onError={(e) => {
                // Handle image load error
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239ca3af' font-size='14'%3EQR Load Error%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {/* Amount */}
            <div className="flex justify-between items-center">
              <span className="sr-only">{accessibleAmount}</span>
              <span aria-hidden="true" className="text-gray-600">Amount:</span>
              <span aria-hidden="true" className="text-xl font-bold text-gray-900">
                {formatAmount(amount)} {currency}
              </span>
            </div>

            {/* Order Number */}
            {orderNumber && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900">{orderNumber}</span>
                  <button
                    onClick={handleCopyOrderNumber}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy order number"
                  >
                    {copied ? (
                      <Check aria-hidden="true" focusable="false" className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy aria-hidden="true" focusable="false" className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <div aria-hidden="true" className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Waiting for payment confirmation...</span>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone aria-hidden="true" focusable="false" className="w-5 h-5 text-blue-600" />
            How to pay
          </h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              <span>Open your banking app (MB Bank, Vietcombank, etc.)</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              <span>Select "Scan QR" or "Transfer" feature</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              <span>Scan the QR code above</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                4
              </span>
              <span>
                Confirm the transfer amount and <strong>do not modify</strong> the transfer content
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                5
              </span>
              <span>Complete the payment - this page will update automatically</span>
            </li>
          </ol>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            leftIcon={<ArrowLeft aria-hidden="true" focusable="false" className="w-4 h-4" />}
            disabled={cancelPaymentMutation.isPending}
            isLoading={cancelPaymentMutation.isPending}
          >
            Cancel Payment
          </Button>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Payment will be confirmed automatically within a few seconds after you complete the
          transfer. Do not close this page until the payment is confirmed.
        </p>
      </div>
    </div>
  );
};

export default SepayQrPage;
