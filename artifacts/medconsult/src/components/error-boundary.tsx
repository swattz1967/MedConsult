import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-red-100 shadow-sm p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
              <p className="text-sm text-gray-500 mt-1">
                An unexpected error occurred. You can try again or refresh the page.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="bg-slate-50 rounded-md px-4 py-3 text-left">
                <p className="text-xs font-mono text-slate-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh page
              </Button>
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
