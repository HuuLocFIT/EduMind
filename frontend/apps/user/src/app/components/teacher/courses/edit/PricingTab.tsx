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
  const [formData, setFormData] = useState({
    price: course.price,
    discountPrice: course.discountPrice || null,
    currency: course.currency || "USD",
  });
  const [isFree, setIsFree] = useState(course.price === 0);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFreeToggle = (checked: boolean) => {
    setIsFree(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, price: 0, discountPrice: null }));
    }
  };

  const handleSave = () => {
    onSave({
      price: isFree ? 0 : formData.price,
      discountPrice: isFree ? undefined : formData.discountPrice || undefined,
    });
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
              value={formData.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="VND">VND (₫)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => handleChange("price", Number(e.target.value))}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formData.discountPrice || ""}
              onChange={(e) =>
                handleChange("discountPrice", e.target.value ? Number(e.target.value) : null)
              }
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Leave empty for no discount"
            />
          </div>

          {formData.price > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Price Preview:</p>
              <div className="flex items-center gap-3">
                {formData.discountPrice && formData.discountPrice < formData.price ? (
                  <>
                    <span className="text-gray-400 line-through text-lg">
                      {formData.currency} {formData.price.toFixed(2)}
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {formData.currency} {formData.discountPrice.toFixed(2)}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                      {Math.round(((formData.price - formData.discountPrice) / formData.price) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">
                    {formData.currency} {formData.price.toFixed(2)}
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

