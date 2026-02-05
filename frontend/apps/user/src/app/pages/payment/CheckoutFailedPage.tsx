import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { XCircle, RefreshCw, ArrowLeft, HelpCircle, Ban, AlertTriangle, CreditCard } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCancelPayment } from "../../hooks/useCheckout";

/**
 * Map backend error codes to user-friendly messages
 */
const getErrorMessage = (errorCode: string | null, defaultMessage: string): { title: string; message: string; showReasons: boolean } => {
  switch (errorCode) {
    // Gateway errors
    case "GATEWAY_ERROR":
      return {
        title: "Payment Gateway Unavailable",
        message: "The payment gateway is temporarily unavailable. Please try again in a few moments.",
        showReasons: false,
      };
    case "GATEWAY_NULL_RESPONSE":
      return {
        title: "Payment Service Error",
        message: "The payment service did not respond. Please retry your payment.",
        showReasons: false,
      };
    case "CURRENCY_NOT_SUPPORTED":
      return {
        title: "Currency Not Supported",
        message: "This payment method doesn't support the selected currency. Please try a different payment method.",
        showReasons: false,
      };
    case "AMOUNT_MISMATCH":
      return {
        title: "Payment Amount Mismatch",
        message: "There was a discrepancy in the payment amount. Please contact support with your order number.",
        showReasons: false,
      };
    case "INSTRUMENT_DECLINED":
      return {
        title: "Payment Declined",
        message: "Your payment method was declined. Please use a different card or payment method.",
        showReasons: true,
      };
    case "PAYER_ACTION_REQUIRED":
      return {
        title: "Additional Verification Required",
        message: "Your bank requires additional verification. Please complete the authentication in the popup window.",
        showReasons: false,
      };

    // PayPal specific
    case "PAYPAL_STATUS_ERROR":
      return {
        title: "PayPal Error",
        message: "There was an issue with PayPal. Please try again or use a different payment method.",
        showReasons: false,
      };

    // SePay specific
    case "PAYMENT_NOT_TRACKED":
      return {
        title: "Payment Not Found",
        message: "We couldn't track your payment. If you completed the transfer, please contact support.",
        showReasons: false,
      };
    case "PAYMENT_EXPIRED":
      return {
        title: "Payment Expired",
        message: "The payment session has expired. Please start a new checkout.",
        showReasons: false,
      };
    case "CONCURRENT_PROCESSING":
      return {
        title: "Payment Processing",
        message: "Your payment is being processed. Please wait a moment and check your order status.",
        showReasons: false,
      };
    case "MANUAL_REFUND_REQUIRED":
      return {
        title: "Refund Processing",
        message: "Your refund requires manual processing. Our support team will contact you within 24-48 hours.",
        showReasons: false,
      };

    // Order/checkout errors
    case "ORDER_EXPIRED":
      return {
        title: "Order Expired",
        message: "This order has expired. Please start a new checkout.",
        showReasons: false,
      };
    case "RETRY_LIMIT_EXCEEDED":
      return {
        title: "Maximum Attempts Reached",
        message: "You have exceeded the maximum number of payment attempts for this order. Please start a new order.",
        showReasons: false,
      };
    case "INVALID_ORDER_STATUS":
      return {
        title: "Invalid Order Status",
        message: "This order cannot be processed in its current state. Please contact support if you need assistance.",
        showReasons: false,
      };
    case "CAPTURE_FAILED":
      return {
        title: "Payment Capture Failed",
        message: "We couldn't capture your payment. Please try again or use a different payment method.",
        showReasons: true,
      };

    // Enrollment failures with refund
    case "ENROLLMENT_FAILED_REFUNDED":
      return {
        title: "Enrollment Failed - Refund Issued",
        message: "Your payment has been automatically refunded due to a system error. Please try again or contact support if you don't receive the refund within 3-5 business days.",
        showReasons: false,
      };
    case "ENROLLMENT_FAILED_MANUAL_REFUND":
      return {
        title: "Enrollment Failed - Support Required",
        message: "Payment was processed but enrollment failed. Our support team has been notified and will process your refund within 24-48 hours. You will receive an email confirmation.",
        showReasons: false,
      };

    default:
      return {
        title: "Payment Failed",
        message: defaultMessage || "Payment could not be processed",
        showReasons: true,
      };
  }
};

export const CheckoutFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelPaymentMutation = useCancelPayment();

  const errorMessageParam = searchParams.get("error") || "Payment could not be processed";
  const errorCode = searchParams.get("errorCode");
  const canRetryParam = searchParams.get("canRetry");
  // PayPal sends orderId when user cancels
  const orderId = searchParams.get("orderId");

  const [isCancelled, setIsCancelled] = useState(false);

  // Parse canRetry from URL or default based on error code
  const canRetry = canRetryParam !== null
    ? canRetryParam === "true"
    : errorCode !== "RETRY_LIMIT_EXCEEDED" && errorCode !== "ENROLLMENT_FAILED_MANUAL_REFUND";

  // Notify backend about cancellation (optional - helps track analytics)
  useEffect(() => {
    if (orderId && !isCancelled) {
      setIsCancelled(true);
      cancelPaymentMutation.mutate(Number(orderId), {
        onSuccess: () => {
          console.log("Payment cancellation recorded");
        },
        onError: (error) => {
          console.error("Failed to record cancellation:", error);
        },
      });
    }
  }, [orderId, isCancelled]);

  const isCancelledByUser = !!orderId && !errorCode;
  const isEnrollmentFailure = errorCode === "ENROLLMENT_FAILED_REFUNDED" || errorCode === "ENROLLMENT_FAILED_MANUAL_REFUND";
  const isRefundPending = errorCode === "ENROLLMENT_FAILED_MANUAL_REFUND" || errorCode === "MANUAL_REFUND_REQUIRED";

  const { title, message, showReasons } = isCancelledByUser
    ? { title: "Payment Cancelled", message: "You cancelled the payment. Your order is saved and you can try again.", showReasons: false }
    : getErrorMessage(errorCode, errorMessageParam);

  // Determine icon and colors based on state
  const getIconConfig = () => {
    if (isCancelledByUser) {
      return { Icon: Ban, bgColor: "bg-yellow-100", iconColor: "text-yellow-600" };
    }
    if (isEnrollmentFailure || isRefundPending) {
      return { Icon: AlertTriangle, bgColor: "bg-orange-100", iconColor: "text-orange-600" };
    }
    if (errorCode === "INSTRUMENT_DECLINED" || errorCode === "CAPTURE_FAILED") {
      return { Icon: CreditCard, bgColor: "bg-red-100", iconColor: "text-red-600" };
    }
    return { Icon: XCircle, bgColor: "bg-red-100", iconColor: "text-red-600" };
  };

  const { Icon, bgColor, iconColor } = getIconConfig();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {title}
        </h1>
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Possible Reasons - only show for payment failures */}
        {showReasons && !isCancelledByUser && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-900 mb-2">
              This might have happened because:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Insufficient funds in your account</li>
              <li>Card details were entered incorrectly</li>
              <li>Your bank declined the transaction</li>
              <li>Network connection was interrupted</li>
            </ul>
          </div>
        )}

        {/* Cancellation info */}
        {isCancelledByUser && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              No charges have been made to your account. You can complete your purchase
              by trying again with the same or a different payment method.
            </p>
          </div>
        )}

        {/* Refund info for enrollment failures */}
        {isEnrollmentFailure && (
          <div className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-orange-900 mb-2">
              {errorCode === "ENROLLMENT_FAILED_REFUNDED" ? "Refund Status:" : "What happens next:"}
            </p>
            <p className="text-sm text-orange-800">
              {errorCode === "ENROLLMENT_FAILED_REFUNDED"
                ? "Your refund has been processed automatically. It may take 3-5 business days to appear in your account depending on your payment provider."
                : "Our support team will review your case and process the refund manually. You will receive an email confirmation within 24-48 hours."}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {canRetry ? (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CHECKOUT)}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CART)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Start New Order
            </Button>
          )}

          {canRetry && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(USER_ROUTES.CART)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Cart
            </Button>
          )}
        </div>

        {/* Help Link */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-500">
            Need help?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              <HelpCircle className="w-3 h-3 inline mr-1" />
              Contact Support
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CheckoutFailedPage;
