import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { XCircle, RefreshCw, ArrowLeft, HelpCircle, Ban } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useCancelPayment } from "../../hooks/useCheckout";

export const CheckoutFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelPaymentMutation = useCancelPayment();

  const errorMessage = searchParams.get("error") || "Payment could not be processed";
  // PayPal sends orderId when user cancels
  const orderId = searchParams.get("orderId");

  const [isCancelled, setIsCancelled] = useState(false);

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

  const isCancelledByUser = !!orderId;
  const title = isCancelledByUser ? "Payment Cancelled" : "Payment Failed";
  const Icon = isCancelledByUser ? Ban : XCircle;
  const iconBgColor = isCancelledByUser ? "bg-yellow-100" : "bg-red-100";
  const iconColor = isCancelledByUser ? "text-yellow-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className={`w-16 h-16 ${iconBgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {title}
        </h1>
        <p className="text-gray-600 mb-6">
          {isCancelledByUser
            ? "You cancelled the payment. Your order is saved and you can try again."
            : decodeURIComponent(errorMessage)}
        </p>

        {/* Possible Reasons - only show for actual failures */}
        {!isCancelledByUser && (
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

        {/* Actions */}
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
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Cart
          </Button>
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
