import React, { useState } from "react";
import type { CourseDetailResponse, UpdateCourseRequest } from "@edumind/shared-types";
import { Button, Input, Switch } from "@edumind/user-ui";
import { Save, DollarSign } from "lucide-react";

interface PricingTabProps {
  course: CourseDetailResponse;
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

export const PricingTab: React.FC<PricingTabProps> = ({ course, onSave, saving }) => {
  const [currency, setCurrency] = useState(course.currency || "USD");
  const [isFree, setIsFree] = useState(course.price === 0);
  const [priceInput, setPriceInput] = useState(course.price > 0 ? String(course.price) : "");
  const [discountInput, setDiscountInput] = useState(
    course.discountPrice ? String(course.discountPrice) : ""
  );

  const priceValue = parseFloat(priceInput) || 0;
  const discountValue = parseFloat(discountInput) || null;

  const handleFreeToggle = (checked: boolean) => {
    setIsFree(checked);
    if (checked) {
      setPriceInput("");
      setDiscountInput("");
    }
  };

  const handleSave = () => {
    const price = isFree ? 0 : priceValue;
    const discountPrice =
      !isFree && discountValue && discountValue < price ? discountValue : undefined;
    onSave({ price, discountPrice, currency });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Free Course</p>
          <p className="text-sm text-gray-600">Make this course available for free</p>
        </div>
        <Switch checked={isFree} onChange={(e) => handleFreeToggle(e.target.checked)} />
      </div>

      {!isFree && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="USD">USD ($)</option>
              <option value="VND">VND (₫)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price</label>
            <Input
              type="text"
              inputMode="decimal"
              min={0}
              value={priceInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setPriceInput(val);
              }}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              min={0}
              value={discountInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setDiscountInput(val);
              }}
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Leave empty for no discount"
            />
          </div>

          {priceValue > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Price Preview:</p>
              <div className="flex items-center gap-3">
                {discountValue && discountValue < priceValue ? (
                  <>
                    <span className="text-gray-400 line-through text-lg">
                      {currency} {priceValue.toFixed(2)}
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {currency} {discountValue.toFixed(2)}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                      {Math.round(((priceValue - discountValue) / priceValue) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">
                    {currency} {priceValue.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isFree && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">FREE</p>
          <p className="text-sm text-gray-600">This course will be available at no cost</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

