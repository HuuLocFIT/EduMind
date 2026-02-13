import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Input, Select } from "@edumind/user-ui";
import { usePayoutSettings, useUpdatePayoutSettings } from "../../../../hooks/usePayoutSettings";
import type { PayoutSettings } from "@edumind/shared-types";

const payoutSettingsFormSchema = z.object({
  preferredMethod: z.enum(["BANK_TRANSFER", "PAYPAL"]),
  bankName: z.string().max(100).optional(),
  accountHolderName: z.string().max(100).optional(),
  bankAccount: z.string().optional(),
  swiftCode: z.string().max(20).optional(),
  bankAddress: z.string().max(200).optional(),
  paypalEmail: z.string().email().optional().or(z.literal("")),
});

type PayoutSettingsFormValues = z.infer<typeof payoutSettingsFormSchema>;

export const PaymentSettingsTab: React.FC = () => {
  const {
    data: settings,
    isLoading,
    error,
  } = usePayoutSettings();

  const {
    mutateAsync: updateSettings,
    isPending: isSaving,
    error: saveError,
    isSuccess,
  } = useUpdatePayoutSettings();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PayoutSettingsFormValues>({
    resolver: zodResolver(payoutSettingsFormSchema),
    defaultValues: {
      preferredMethod: "BANK_TRANSFER",
    },
  });

  React.useEffect(() => {
    if (settings) {
      const initial: PayoutSettingsFormValues = {
        preferredMethod: (settings.preferredMethod as PayoutSettingsFormValues["preferredMethod"]) ?? "BANK_TRANSFER",
        bankName: settings.bankName ?? "",
        accountHolderName: settings.accountHolderName ?? "",
        bankAccount: settings.bankAccount ?? "",
        swiftCode: settings.swiftCode ?? "",
        bankAddress: settings.bankAddress ?? "",
        paypalEmail: settings.paypalEmail ?? "",
      };
      reset(initial);
    }
  }, [settings, reset]);

  const preferredMethod = watch("preferredMethod");

  const onSubmit = async (values: PayoutSettingsFormValues) => {
    const payload: PayoutSettings = {
      preferredMethod: values.preferredMethod,
      bankName: values.bankName || undefined,
      accountHolderName: values.accountHolderName || undefined,
      bankAccount: values.bankAccount || undefined,
      swiftCode: values.swiftCode || undefined,
      bankAddress: values.bankAddress || undefined,
      paypalEmail: values.paypalEmail || undefined,
    };

    await updateSettings(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
        <p className="text-sm text-gray-500">
          Configure how you would like to receive your payouts. These details will be used to pre-fill
          future payouts and help admins send manual transfers safely.
        </p>
      </div>

      {error && (
        <Alert
          variant="error"
          title="Error"
          message="Failed to load payout settings"
        />
      )}

      {saveError && (
        <Alert
          variant="error"
          title="Error"
          message="Failed to update payout settings"
        />
      )}

      {isSuccess && !saveError && (
        <Alert
          variant="success"
          title="Saved"
          message="Your payout settings have been updated."
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Preferred Payment Method
          </label>
          <Select
            {...register("preferredMethod")}
            disabled={isLoading || isSaving}
          >
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="PAYPAL">PayPal</option>
          </Select>
        </div>

        {preferredMethod === "BANK_TRANSFER" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Input
                label="Bank Name"
                placeholder="Enter bank name"
                {...register("bankName")}
                disabled={isSaving}
              />
              {errors.bankName && (
                <p className="text-xs text-red-600">{errors.bankName.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Input
                label="Account Holder Name"
                placeholder="Enter account holder name"
                {...register("accountHolderName")}
                disabled={isSaving}
              />
              {errors.accountHolderName && (
                <p className="text-xs text-red-600">
                  {errors.accountHolderName.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Input
                label="Bank Account / Account Number"
                placeholder="Enter bank account number"
                {...register("bankAccount")}
                disabled={isSaving}
              />
              {errors.bankAccount && (
                <p className="text-xs text-red-600">
                  {errors.bankAccount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                label="SWIFT Code (optional)"
                placeholder="Enter SWIFT/BIC code"
                {...register("swiftCode")}
                disabled={isSaving}
              />
              {errors.swiftCode && (
                <p className="text-xs text-red-600">{errors.swiftCode.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <Input
                label="Bank Address (optional)"
                placeholder="Enter bank branch address"
                {...register("bankAddress")}
                disabled={isSaving}
              />
              {errors.bankAddress && (
                <p className="text-xs text-red-600">
                  {errors.bankAddress.message}
                </p>
              )}
            </div>
          </div>
        )}

        {preferredMethod === "PAYPAL" && (
          <div className="space-y-1">
            <Input
              label="PayPal Email"
              placeholder="Enter PayPal email"
              type="email"
              {...register("paypalEmail")}
              disabled={isSaving}
            />
            {errors.paypalEmail && (
              <p className="text-xs text-red-600">
                {errors.paypalEmail.message as string}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

