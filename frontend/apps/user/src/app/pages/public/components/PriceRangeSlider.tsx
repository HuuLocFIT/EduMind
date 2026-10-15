import React, { useRef } from "react";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  /** Fires on every movement, so the caller can show the value live. */
  onChange: (value: [number, number]) => void;
  /** Fires once the value is final: thumb released, or each keyboard step. */
  onCommit: (value: [number, number]) => void;
  disabled?: boolean;
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  onCommit,
  disabled = false,
}) => {
  const [minValue, maxValue] = value;
  // Latest value seen by this slider, read on release (the prop may not have re-rendered yet)
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const isDraggingRef = useRef(false);

  const updateValue = (nextValue: [number, number]) => {
    latestValueRef.current = nextValue;
    onChange(nextValue);

    // Keyboard changes do not start a pointer interaction, so commit them
    // immediately. Pointer changes are committed when the thumb is released.
    if (!isDraggingRef.current) {
      onCommit(nextValue);
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), maxValue);
    updateValue([newMin, maxValue]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), minValue);
    updateValue([minValue, newMax]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    // Keep receiving pointerup even when the pointer is released outside the slider
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const commitPointerChange = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    onCommit(latestValueRef.current);
  };

  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  return (
    <div className="relative py-4" role="group" aria-label="Price range slider">
      {/* Track */}
      <div className="relative h-2 bg-gray-200 rounded-full" aria-hidden="true">
        {/* Active Range */}
        <div
          className="absolute h-2 bg-blue-600 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
      </div>

      {/* Min Handle */}
      <input
        type="range"
        min={min}
        max={max}
        value={minValue}
        onChange={handleMinChange}
        onPointerDown={handlePointerDown}
        onPointerUp={commitPointerChange}
        onPointerCancel={commitPointerChange}
        onLostPointerCapture={commitPointerChange}
        disabled={disabled}
        aria-label="Minimum price"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={minValue}
        aria-valuetext={`$${minValue}`}
        className="absolute top-2 w-full h-6 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0"
      />

      {/* Max Handle */}
      <input
        type="range"
        min={min}
        max={max}
        value={maxValue}
        onChange={handleMaxChange}
        onPointerDown={handlePointerDown}
        onPointerUp={commitPointerChange}
        onPointerCancel={commitPointerChange}
        onLostPointerCapture={commitPointerChange}
        disabled={disabled}
        aria-label="Maximum price"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={maxValue}
        aria-valuetext={`$${maxValue}`}
        className="absolute top-2 w-full h-6 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0"
      />

      {/* Value Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-600" aria-live="polite">
        <span>${minValue}</span>
        <span>${maxValue}</span>
      </div>
    </div>
  );
};
