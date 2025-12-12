import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class QueryErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: unknown) {
    // Log to console; could be extended to external logger
    console.error("[Boundary] Caught error", { error, info });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try again.
            </p>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


