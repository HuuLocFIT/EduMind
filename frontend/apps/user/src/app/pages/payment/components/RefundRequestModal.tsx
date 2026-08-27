import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, useToast } from "@edumind/user-ui";
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { useRefundPolicy, useSubmitRefundRequest } from "../../../hooks/useRefunds";
import { RefundRequestSchema, type RefundRequest } from "@edumind/shared-types";
import { PaymentMethod } from "@edumind/shared-constants";

// Create conditional schema based on payment method
const createRefundFormSchema = (paymentMethod: string | undefined) => {
  // For SePay (manual refund), bank fields are required
  if (paymentMethod === PaymentMethod.SEPAY) {
    return RefundRequestSchema.extend({
      bankName: z.string().min(1, "Bank name is required for SePay refunds").max(100),
      accountHolderName: z.string().min(1, "Account holder name is required for SePay refunds").max(100),
      accountNumber: z.string().min(1, "Account number is required for SePay refunds").max(50),
    });
  }
  
  // For PayPal and other auto-refund methods, bank fields are optional
  return RefundRequestSchema;
};

type RefundFormData = z.infer<typeof RefundRequestSchema>;

interface RefundRequestModalProps {
  orderId: number;
  paymentMethod?: string; // Payment method from the order
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (refundId: number) => void;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  orderId,
  paymentMethod,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const { data: policy, isLoading: isLoadingPolicy, error: policyError } = useRefundPolicy(orderId, isOpen);
  const submitRefund = useSubmitRefundRequest();

  const modalRef = useFocusTrap(isOpen, onClose);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Determine if bank info is required (only for SePay)
  const requiresBankInfo = paymentMethod === PaymentMethod.SEPAY;
  const refundFormSchema = React.useMemo(
    () => createRefundFormSchema(paymentMethod),
    [paymentMethod]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RefundFormData>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      orderId,
      reason: "",
      notes: "",
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      swiftCode: "",
      bankAddress: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({ 
        orderId, 
        reason: "", 
        notes: "",
        bankName: "",
        accountHolderName: "",
        accountNumber: "",
        swiftCode: "",
        bankAddress: "",
      });
    }
  }, [isOpen, orderId, reset]);

  const onSubmit = async (data: RefundFormData) => {
    try {
      // Clean up bank fields for auto-refund methods (PayPal, etc.)
      // Only send bank info if it's required (SePay)
      const requestData: RefundRequest = {
        ...data,
        // For auto-refund methods, set bank fields to undefined instead of empty strings
        bankName: requiresBankInfo ? data.bankName : undefined,
        accountHolderName: requiresBankInfo ? data.accountHolderName : undefined,
        accountNumber: requiresBankInfo ? data.accountNumber : undefined,
        swiftCode: requiresBankInfo ? data.swiftCode : undefined,
        bankAddress: requiresBankInfo ? data.bankAddress : undefined,
      };
      
      const refund = await submitRefund.mutateAsync(requestData);
      showSuccess("Refund request submitted successfully");
      onSuccess(refund.id);
    } catch (err: any) {
      showError(err.message || "Failed to submit refund request");
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Request Refund"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Request Refund</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {policy?.requiresAdminApproval
                  ? "Our team will review within 3-5 business days"
                  : "Your refund will be processed automatically"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close refund modal"
            >
              <XCircle className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

          {/* Loading State */}
          {isLoadingPolicy && (
            <div className="flex items-center justify-center py-12">
              <Loading />
            </div>
          )}

          {/* Policy Error */}
          {policyError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Unable to load refund policy</p>
                  <p className="text-xs text-red-700 mt-1">
                    {(policyError as Error)?.message || "Please try again later"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Policy Info */}
          {policy && !policy.eligible && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Not Eligible for Refund</p>
                  <p className="text-xs text-red-700 mt-1">{policy.eligibilityReason}</p>
                </div>
              </div>
            </div>
          )}

          {policy && policy.eligible && (
            <>
              {/* Policy Info Cards - Compact */}
              <div className="mb-3 space-y-3">
                <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200/50">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-900">Eligible for Refund</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Amount: <span className="font-bold">{formatCurrency(policy.eligibleRefundAmount || 0, "USD")}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {policy.requiresAdminApproval ? (
                  <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200/50">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Requires admin approval. Processing time: 3-5 business days.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-blue-50 rounded-lg border border-blue-200/50">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900 leading-relaxed">
                        Auto-approved. Processed within {policy.autoApproveDays} days.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <form id="refund-request-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
                {/* Bank Account Information - Only shown for SePay (manual refund) */}
                {requiresBankInfo && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-lg border border-blue-200/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Info className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900">Bank Account Information</h4>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Required for manual refund processing
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="bankName" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="bankName"
                          type="text"
                          {...register("bankName")}
                          placeholder="e.g., Vietcombank, BIDV, ACB..."
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm ${
                            errors.bankName ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {errors.bankName && (
                          <p className="text-xs text-red-600 mt-1">{errors.bankName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="accountHolderName" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Account Holder Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="accountHolderName"
                          type="text"
                          {...register("accountHolderName")}
                          placeholder="Full name on account"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm ${
                            errors.accountHolderName ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {errors.accountHolderName && (
                          <p className="text-xs text-red-600 mt-1">{errors.accountHolderName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="accountNumber" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="accountNumber"
                          type="text"
                          {...register("accountNumber")}
                          placeholder="Account number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-mono ${
                            errors.accountNumber ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {errors.accountNumber && (
                          <p className="text-xs text-red-600 mt-1">{errors.accountNumber.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="swiftCode" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          SWIFT/BIC Code <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                          id="swiftCode"
                          type="text"
                          {...register("swiftCode")}
                          placeholder="For international transfers"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label htmlFor="bankAddress" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Bank Branch/Address <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <input
                          id="bankAddress"
                          type="text"
                          {...register("bankAddress")}
                          placeholder="Branch location"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Info message for auto-refund methods */}
                {!requiresBankInfo && (
                  <div className="p-3.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200/50">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-900 mb-0.5">Automatic Refund</p>
                        <p className="text-xs text-green-700 leading-relaxed">
                          Your refund will be automatically processed and returned to your original payment method.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col">
                  <label htmlFor="reason" className="block text-sm font-semibold text-gray-900 mb-1">
                    Reason for Refund <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    {...register("reason")}
                    placeholder="Please provide a detailed reason for your refund request (minimum 10 characters)..."
                    rows={3}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-sm ${
                      errors.reason ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.reason && (
                    <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-1">
                    Additional Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Any additional information that might help us process your refund..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-sm"
                  />
                </div>
              </form>
            </>
          )}

          {/* Not Eligible - Close Button */}
          {policy && !policy.eligible && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-gray-300 hover:bg-gray-50 text-sm"
              >
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Fixed Footer with Buttons */}
        {policy && policy.eligible && (
          <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  reset();
                }}
                className="flex-1 border-gray-300 hover:bg-gray-50 text-sm"
                disabled={submitRefund.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="refund-request-form"
                variant="primary"
                size="sm"
                isLoading={submitRefund.isPending}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                Submit Request
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
