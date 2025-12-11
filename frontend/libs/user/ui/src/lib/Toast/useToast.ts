import { useToastContext } from "./ToastContext";

// Re-export ToastOptions for backward compatibility
export type { ToastOptions } from "./ToastContext";

/**
 * Hook to access toast functions and state.
 * Must be used within a ToastProvider.
 * 
 * @example
 * ```tsx
 * const { success, error, toasts, closeToast } = useToast();
 * 
 * // Show a success toast
 * success("Operation completed!");
 * 
 * // Show an error toast
 * error("Something went wrong");
 * ```
 */
export const useToast = () => {
  return useToastContext();
};
