import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Use Component's setState method
    (this as Component<Props, State>).setState({
      error,
      errorInfo,
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallbackWrapper error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

// Wrapper component to use hooks properly
const ErrorFallbackWrapper: React.FC<{ error: Error | null; errorInfo: ErrorInfo | null }> = ({ error, errorInfo }) => {
  return <ErrorFallback error={error} errorInfo={errorInfo} />;
};

const ErrorFallback: React.FC<{ error: Error | null; errorInfo: ErrorInfo | null }> = ({ error, errorInfo }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    window.location.reload();
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-cream-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-cream-900 mb-2">Something went wrong</h1>
          <p className="text-cream-600 mb-6">
            We encountered an unexpected error. Please try refreshing the page or return to the home page.
          </p>

          {error && process.env.NODE_ENV === 'development' && (
            <div className="w-full mb-6 p-4 bg-cream-50 rounded-lg border border-cream-200 text-left">
              <p className="text-sm font-semibold text-cream-900 mb-2">Error Details:</p>
              <p className="text-xs font-mono text-red-600 mb-2">{error.message}</p>
              {errorInfo && errorInfo.componentStack && (
                <details className="text-xs text-cream-600">
                  <summary className="cursor-pointer font-semibold mb-2">Stack Trace</summary>
                  <pre className="overflow-auto max-h-40 text-xs">{errorInfo.componentStack}</pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReload}
              className="flex items-center gap-2 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-cream-700 rounded-lg hover:bg-cream-200 transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component to use hooks
const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;







