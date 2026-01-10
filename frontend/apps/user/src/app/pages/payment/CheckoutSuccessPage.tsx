import React, { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, Button } from "@edumind/user-ui";
import { CheckCircle, ArrowRight, BookOpen, Package } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");

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
          <p>✅ A confirmation email has been sent to your email address</p>
          <p>✅ You can now access your purchased courses</p>
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
