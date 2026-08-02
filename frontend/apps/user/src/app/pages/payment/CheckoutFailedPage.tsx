import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { XCircle, RefreshCw, ArrowLeft, HelpCircle, Ban, AlertTriangle, CreditCard } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCancelPayment } from "../../hooks/useCheckout";

type FailureContent = {
  title: string;
  message: string;
  showReasons?: boolean;
  retryable?: boolean;
};

const FAILURE_CONTENT: Record<string, FailureContent> = {
  GATEWAY_ERROR: { title: "Payment Gateway Unavailable", message: "The payment gateway is temporarily unavailable. Please try again in a few moments.", retryable: true },
  GATEWAY_NULL_RESPONSE: { title: "Payment Service Error", message: "The payment service did not respond. Please retry your payment.", retryable: true },
  CURRENCY_NOT_SUPPORTED: { title: "Currency Not Supported", message: "This payment method doesn't support the selected currency. Please try a different payment method.", retryable: true },
  AMOUNT_MISMATCH: { title: "Payment Amount Mismatch", message: "There was a discrepancy in the payment amount. Please contact support with your order number." },
  INSTRUMENT_DECLINED: { title: "Payment Declined", message: "Your payment method was declined. Please use a different card or payment method.", showReasons: true, retryable: true },
  PAYER_ACTION_REQUIRED: { title: "Additional Verification Required", message: "Your bank requires additional verification. Please restart checkout and complete the authentication step.", retryable: true },
  PAYPAL_STATUS_ERROR: { title: "PayPal Error", message: "There was an issue with PayPal. Please try again or use a different payment method.", retryable: true },
  PAYMENT_NOT_TRACKED: { title: "Payment Not Found", message: "We couldn't track your payment. If you completed the transfer, please contact support." },
  PAYMENT_EXPIRED: { title: "Payment Expired", message: "The payment session has expired. Please start a new checkout." },
  CONCURRENT_PROCESSING: { title: "Payment Processing", message: "Your payment is being processed. Please wait a moment and check your order status." },
  MANUAL_REFUND_REQUIRED: { title: "Manual Refund Required", message: "Your refund requires manual processing. Our support team will contact you within 24–48 hours." },
  ORDER_EXPIRED: { title: "Order Expired", message: "This order has expired. Please start a new checkout." },
  RETRY_LIMIT_EXCEEDED: { title: "Maximum Attempts Reached", message: "You have exceeded the maximum number of payment attempts for this order. Please start a new order." },
  INVALID_ORDER_STATUS: { title: "Order Cannot Be Processed", message: "This order cannot be processed in its current state. Please contact support if you need assistance." },
  CAPTURE_FAILED: { title: "Payment Capture Failed", message: "We couldn't capture your payment. Please try again or use a different payment method.", showReasons: true, retryable: true },
  ENROLLMENT_FAILED_REFUNDED: { title: "Enrollment Failed — Refund Issued", message: "We could not enroll you in the course, so your payment was automatically refunded." },
  ENROLLMENT_FAILED_MANUAL_REFUND: { title: "Enrollment Failed — Manual Refund Required", message: "Payment was processed but enrollment failed. Our support team has been notified and will process your refund." },
};

const DEFAULT_FAILURE: FailureContent = {
  title: "Payment Failed",
  message: "Payment could not be processed. Try again from your cart or contact support if the problem continues.",
  retryable: true,
  showReasons: true,
};

export const CheckoutFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelPaymentMutation = useCancelPayment();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [cancellationRecorded, setCancellationRecorded] = useState(false);

  const errorCode = searchParams.get("errorCode");
  const rawOrderId = searchParams.get("orderId");
  const orderId = rawOrderId && /^\d+$/.test(rawOrderId) ? Number(rawOrderId) : null;
  const isCancelledByUser = orderId !== null && !errorCode;
  const isEnrollmentFailure = errorCode === "ENROLLMENT_FAILED_REFUNDED" || errorCode === "ENROLLMENT_FAILED_MANUAL_REFUND";
  const isRefundPending = errorCode === "ENROLLMENT_FAILED_MANUAL_REFUND" || errorCode === "MANUAL_REFUND_REQUIRED";
  const content = isCancelledByUser
    ? { title: "Payment Cancelled", message: "You cancelled the payment. Your order is saved and you can try again.", retryable: true }
    : (errorCode && FAILURE_CONTENT[errorCode]) || DEFAULT_FAILURE;
  // A query parameter may disable retry, but cannot make a non-retryable backend state retryable.
  const canRetry = Boolean(content.retryable) && searchParams.get("canRetry") !== "false";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (orderId !== null && !cancellationRecorded) {
      setCancellationRecorded(true);
      cancelPaymentMutation.mutate(orderId, {
        onError: () => {
          // Recording cancellation is best-effort and must not block recovery actions.
        },
      });
    }
  }, [orderId, cancellationRecorded, cancelPaymentMutation]);

  const Icon = isCancelledByUser ? Ban : isEnrollmentFailure || isRefundPending ? AlertTriangle : errorCode === "INSTRUMENT_DECLINED" || errorCode === "CAPTURE_FAILED" ? CreditCard : XCircle;
  const iconStyle = isCancelledByUser ? "bg-yellow-100 text-yellow-700" : isEnrollmentFailure || isRefundPending ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div aria-hidden="true" className={`w-16 h-16 ${iconStyle} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className="w-8 h-8" />
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">
          {content.title}
        </h1>
        <p className="text-gray-700 mb-6">{content.message}</p>

        {content.showReasons && !isCancelledByUser && (
          <section aria-labelledby="possible-reasons" className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
            <h2 id="possible-reasons" className="text-sm font-semibold text-gray-900 mb-2">Possible reasons</h2>
            <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
              <li>Insufficient funds in your account</li>
              <li>Card details were entered incorrectly</li>
              <li>Your bank declined the transaction</li>
              <li>The network connection was interrupted</li>
            </ul>
          </section>
        )}

        {isCancelledByUser && (
          <section aria-labelledby="cancellation-details" className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h2 id="cancellation-details" className="text-sm font-semibold text-blue-950 mb-2">Cancellation details</h2>
            <p className="text-sm text-blue-900">No charges have been made to your account. You can complete your purchase with the same or a different payment method.</p>
          </section>
        )}

        {(isEnrollmentFailure || isRefundPending) && (
          <section aria-labelledby="refund-status" role="status" className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
            <h2 id="refund-status" className="text-sm font-semibold text-orange-950 mb-2">Refund status</h2>
            {errorCode === "ENROLLMENT_FAILED_REFUNDED" ? (
              <p className="text-sm text-orange-950"><strong>Refund issued.</strong> It may take 3–5 business days to appear, depending on your payment provider.</p>
            ) : (
              <ol className="text-sm text-orange-950 list-decimal pl-5 space-y-1">
                <li><strong>Now:</strong> Your refund request is awaiting manual review.</li>
                <li><strong>Within 24–48 hours:</strong> Support will email you with an update.</li>
                <li><strong>After approval:</strong> Your payment provider will return the funds.</li>
              </ol>
            )}
          </section>
        )}

        <section aria-labelledby="next-steps">
          <h2 id="next-steps" className="text-lg font-semibold text-gray-900 mb-3">Next steps</h2>
          <div className="space-y-3">
            {canRetry ? (
              <Button variant="primary" className="w-full" onClick={() => navigate(USER_ROUTES.CHECKOUT)} leftIcon={<RefreshCw aria-hidden="true" className="w-4 h-4" />}>
                Try Again
              </Button>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => navigate(USER_ROUTES.CART)} leftIcon={<ArrowLeft aria-hidden="true" className="w-4 h-4" />}>
                Start New Order
              </Button>
            )}
            {canRetry && (
              <Button variant="outline" className="w-full" onClick={() => navigate(USER_ROUTES.CART)} leftIcon={<ArrowLeft aria-hidden="true" className="w-4 h-4" />}>
                Return to Cart
              </Button>
            )}
          </div>
        </section>

        <div className="mt-6 pt-6 border-t">
          <a href="mailto:support@edumind.com" className="inline-flex items-center text-blue-700 underline hover:no-underline">
            <HelpCircle aria-hidden="true" className="w-4 h-4 mr-1" />
            Contact Support
          </a>
        </div>
      </Card>
    </main>
  );
};

export default CheckoutFailedPage;
