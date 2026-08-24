import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, InputProps } from "./Input";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type"> & { visibilityLabel?: string }
>(({ visibilityLabel = "password", ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      ref={ref}
      type={showPassword ? "text" : "password"}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          aria-label={`${showPassword ? "Hide" : "Show"} ${visibilityLabel}`}
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" className="w-5 h-5" />
          ) : (
            <Eye aria-hidden="true" className="w-5 h-5" />
          )}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = "PasswordInput";
