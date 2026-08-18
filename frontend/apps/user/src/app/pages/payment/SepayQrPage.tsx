import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import {
  QrCode,
  Clock,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { usePaymentStatus, useCancelPayment, formatTimeRemaining, calculateTimeRemaining } from "../../hooks/useCheckout";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

type PageState = "scanning" | "expired" | "error";

/** One row of the bank transfer details list. */
type TransferField = {
  field: string;
  term: string;
  /** Lower-case name used in the copy button label and the copy announcement. */
  label: string;
  value: string;
  mono: boolean;
};

// Order expiration time in minutes (matches backend: 15 minutes, payment.sepay.qr-expire-minutes)
const ORDER_EXPIRATION_MINUTES = 15;
// Fallback initial time before we get createdAt from backend
const INITIAL_FALLBACK_SECONDS = ORDER_EXPIRATION_MINUTES * 60;
// Below this many seconds the countdown is shown as a warning. Colour alone is not
// an accessible cue, so the same threshold drives a live-region announcement.
const EXPIRY_WARNING_SECONDS = 60;

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
  // Bank transfer details - the accessible (readable/copyable) alternative to the
  // QR image, which is aria-hidden and unusable for screen-reader users.
  const bankCode = searchParams.get("bankCode");
  const bankName = searchParams.get("bankName");
  const bankAccount = searchParams.get("bankAccount");
  const accountName = searchParams.get("accountName");
  const transferContent = searchParams.get("transferContent");

  const orderId = orderIdParam ? Number(orderIdParam) : null;

  const [pageState, setPageState] = useState<PageState>("scanning");
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_FALLBACK_SECONDS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyAnnouncement, setCopyAnnouncement] = useState("");
  const copyResetTimeoutRef = useRef<number | null>(null);
  // "expired" swaps in for the scanning UI within this same mounted component
  // (no route change), so nothing else tells a screen reader the page changed.
  // Move focus to that state's heading whenever it appears.
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);

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

      // Check for successful completion. Navigate immediately (no intermediate
      // "success" screen/delay) - an instant redirect has no perceivable time
      // limit for SC 2.2.1 to apply to, and CheckoutSuccessPage owns the actual
      // confirmation UI and focus management for this transaction.
      if (statusData.success && statusData.orderStatus === "COMPLETED") {
        navigate(`${USER_ROUTES.CHECKOUT_SUCCESS}?order=${statusData.orderNumber || orderNumber}&orderId=${statusData.orderId || orderId}`);
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

  // "expired" is a stable terminal state the user must act on (Try Again /
  // Return to Cart), so move focus to its heading for VoiceOver/NVDA orientation.
  useEffect(() => {
    if (pageState === "expired") {
      stateHeadingRef.current?.focus();
    }
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

  // Copy a single field to the clipboard. Both copy icons are aria-hidden, so the
  // swap is silent for screen readers - announce the result through a live region.
  const copyField = useCallback((field: string, label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setCopyAnnouncement(`${label} copied`);
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
      setCopyAnnouncement("");
    }, 2000);
  }, []);

  useEffect(
    () => () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    },
    []
  );

  const transferFields: TransferField[] = [
    { field: "bank", term: "Bank", label: "bank name", value: bankName || bankCode, mono: false },
    { field: "account", term: "Account number", label: "account number", value: bankAccount, mono: true },
    { field: "beneficiary", term: "Beneficiary", label: "beneficiary name", value: accountName, mono: false },
    { field: "content", term: "Transfer content", label: "transfer content", value: transferContent, mono: true },
  ].flatMap((entry) => (entry.value ? [{ ...entry, value: entry.value }] : []));

  const expiryWarning =
    timeRemaining > 0 && timeRemaining <= EXPIRY_WARNING_SECONDS
      ? "Less than 1 minute remaining to complete payment."
      : "";

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

  const seoMetaTags = (
    <SeoMetaTags
      title="Scan to Pay"
      description="Scan the QR code with your banking app to complete your SePay payment."
      canonicalUrl={USER_ROUTES.CHECKOUT_SEPAY_QR}
      noIndex
    />
  );

  // Validate required params
  if (!qrUrl || !orderId) {
    return (
      <>
        {seoMetaTags}
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
      </>
    );
  }

  // Expired state
  if (pageState === "expired") {
    return (
      <>
        {seoMetaTags}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock aria-hidden="true" focusable="false" className="w-8 h-8 text-yellow-600" />
            </div>
            <h1
              ref={stateHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
            >
              QR Code Expired
            </h1>
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
      </>
    );
  }

  // Main scanning state - show QR code
  return (
    <>
      {seoMetaTags}
      <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode aria-hidden="true" focusable="false" className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan to Pay with SePay</h1>
          <p className="text-gray-600">
            Use your banking app to scan the QR code, or enter the bank transfer details below
            manually, to complete the payment
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

          <div role="status" className="sr-only">
            {expiryWarning}
          </div>
          {expiryWarning && (
            <div aria-hidden="true" className="mb-4 text-center text-sm font-medium text-red-700">
              {expiryWarning}
            </div>
          )}

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
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-xl font-bold text-gray-900">
                  {formatAmount(amount)} {currency}
                </span>
                {amount && (
                  <button
                    type="button"
                    onClick={() => copyField("amount", "amount", amount)}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Copy amount"
                    title="Copy amount"
                  >
                    {copiedField === "amount" ? (
                      <Check aria-hidden="true" focusable="false" className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy aria-hidden="true" focusable="false" className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Order Number */}
            {orderNumber && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900">{orderNumber}</span>
                  <button
                    type="button"
                    onClick={() => copyField("orderNumber", "order number", orderNumber)}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Copy order number"
                    title="Copy order number"
                  >
                    {copiedField === "orderNumber" ? (
                      <Check aria-hidden="true" focusable="false" className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy aria-hidden="true" focusable="false" className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bank transfer details - text alternative to the QR image (WCAG 1.1.1).
              The QR code is aria-hidden, so these fields are the only way a screen
              reader user can complete the transfer. */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Bank transfer details</h2>
            {transferFields.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Can&apos;t scan the QR code? Enter these details in your banking app manually and
                  transfer the exact amount shown above. Keep the transfer content unchanged so the
                  payment can be matched to your order.
                </p>
                <dl className="space-y-3">
                  {transferFields.map((entry) => (
                    <div key={entry.field} className="flex justify-between items-start gap-3">
                      <dt className="text-gray-600 flex-shrink-0">{entry.term}</dt>
                      <dd className="flex items-center gap-2 text-right">
                        <span
                          className={
                            entry.mono
                              ? "font-mono text-sm text-gray-900 break-all"
                              : "text-sm text-gray-900"
                          }
                        >
                          {entry.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyField(entry.field, entry.label, entry.value)}
                          className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          aria-label={`Copy ${entry.label}`}
                          title={`Copy ${entry.label}`}
                        >
                          {copiedField === entry.field ? (
                            <Check aria-hidden="true" focusable="false" className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy aria-hidden="true" focusable="false" className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Bank transfer details are unavailable for this payment session, so the QR code above
                is the only way to pay. If you cannot scan it, cancel this payment and contact
                support to complete your order another way.
              </p>
            )}
          </div>

          {/* Announces the result of every copy button: both icons are aria-hidden,
              so the icon swap alone tells a screen reader nothing. */}
          <div role="status" aria-live="polite" className="sr-only">
            {copyAnnouncement}
          </div>

          {/* Status indicator - role="status" so background polling updates in this
              region are announced politely instead of silently changing. */}
          <div
            role="status"
            className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500"
          >
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
              <span>
                Select "Scan QR" - or select "Transfer" and enter the bank transfer details listed
                above
              </span>
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
    </>
  );
};

export default SepayQrPage;
