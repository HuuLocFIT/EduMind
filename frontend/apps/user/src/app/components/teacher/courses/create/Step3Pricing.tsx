import React, { useState } from "react";
import { Input, Switch } from "@edumind/user-ui";
import { DollarSign } from "lucide-react";
import type { StepProps } from "./types";

export const Step3Pricing: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [isFree, setIsFree] = useState(data.price === 0);
  const [priceInput, setPriceInput] = useState(
    data.price && data.price > 0 ? String(data.price) : ""
  );
  const [discountInput, setDiscountInput] = useState(
    data.discountPrice ? String(data.discountPrice) : ""
  );

  const handlePriceChange = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setPriceInput(val);
      const num = parseFloat(val);
      onChange({ price: isNaN(num) ? undefined : num });
    }
  };

  const handleDiscountChange = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setDiscountInput(val);
      const num = parseFloat(val);
      onChange({ discountPrice: isNaN(num) ? undefined : num });
    }
  };

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
          onChange={(e) => {
            const checked = e.target.checked;
            setIsFree(checked);
            if (checked) {
              setPriceInput("");
              setDiscountInput("");
              onChange({ price: 0, discountPrice: undefined });
            } else {
              onChange({ price: undefined, discountPrice: undefined });
            }
          }}
        />
      </div>

      {!isFree && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="course-price" className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <Input
                id="course-price"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="99.99"
                error={errors["price"]}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>

            <div>
              <label htmlFor="course-currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="course-currency"
                value={data.currency || "USD"}
                onChange={(e) => onChange({ currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="USD">USD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="course-discount-price" className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              id="course-discount-price"
              type="text"
              inputMode="decimal"
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
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

