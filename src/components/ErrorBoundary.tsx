import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex-1 flex items-center justify-center bg-background p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-foreground mb-2">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
