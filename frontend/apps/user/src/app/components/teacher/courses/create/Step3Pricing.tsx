import React, { useState, useEffect } from "react";
import { Input, Switch } from "@edumind/user-ui";
import { DollarSign } from "lucide-react";
import type { StepProps } from "./types";

export const Step3Pricing: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [isFree, setIsFree] = useState(data.price === 0);

  // Sync isFree state with data.price
  useEffect(() => {
    setIsFree(data.price === 0);
  }, [data.price]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Free Course</p>
          <p className="text-sm text-gray-600">
            Make this course available for free
          </p>
        </div>
        <Switch
          checked={isFree}
          onChange={(checked) => {
            setIsFree(checked.target.checked);
            onChange({ price: checked ? 0 : undefined });
          }}
        />
      </div>

      {!isFree && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={data.price || ""}
                onChange={(e) => onChange({ price: Number(e.target.value) })}
                placeholder="99.99"
                error={errors["price"]}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={data.currency || "USD"}
                onChange={(e) => onChange({ currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="VND">VND (₫)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={data.discountPrice || ""}
              onChange={(e) =>
                onChange({ discountPrice: Number(e.target.value) || undefined })
              }
              placeholder="79.99"
              error={errors["discountPrice"]}
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Leave empty for no discount"
            />
          </div>
        </>
      )}
    </div>
  );
};

