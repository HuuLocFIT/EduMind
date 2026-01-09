import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";

export const CheckoutFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get("error") || "Payment could not be processed";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-6">
          {decodeURIComponent(errorMessage)}
        </p>

        {/* Possible Reasons */}
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
