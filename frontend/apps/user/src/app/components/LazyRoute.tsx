import { ComponentType, lazy, LazyExoticComponent } from "react";

/**
 * Error fallback component for lazy loading failures
 */
const LazyLoadError = ({ 
  retry, 
  error 
}: { 
  retry: () => void;
  error?: Error;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Failed to load page
      </h2>
      <p className="text-gray-600 mb-4">
        {error?.message || "There was a problem loading this page. Please try again."}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
          onClick={() => window.history.back()}
        >
          Go back
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          onClick={retry}
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

/**
 * Wrapper for lazy loading with error handling
 * 
 * Note: React's lazy() doesn't support retrying failed imports directly.
 * Errors are caught and displayed, but retry requires a page reload or
 * navigation away and back. The error boundary will handle component-level errors.
 * 
 * @param importFn - Function that returns a promise resolving to the component module
 * @returns Lazy-loaded component with error handling
 */
export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  const LazyComponent = lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      // Log error for debugging
      console.error("[LazyRoute] Failed to load component:", error);

      // Return error component that allows user to retry via page reload
      return {
        default: ((props: any) => (
          <LazyLoadError 
            retry={() => window.location.reload()} 
            error={error as Error}
          />
        )) as T,
      };
    }
  });

  return LazyComponent;
}
