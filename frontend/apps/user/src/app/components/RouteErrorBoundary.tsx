import React, { Component, ReactNode } from "react";
import { QueryErrorBoundary } from "./QueryErrorBoundary";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * RouteErrorBoundary - Error boundary for route-level error isolation
 * 
 * Catches errors in route components and displays a fallback UI
 * without crashing the entire app. Each route group can have its own boundary.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("[RouteErrorBoundary] Caught error:", { error, errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
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
                onClick={this.handleReset}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Combined error boundary wrapper that includes both route and query error handling
 */
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <QueryErrorBoundary>
    <RouteErrorBoundary>{children}</RouteErrorBoundary>
  </QueryErrorBoundary>
);

