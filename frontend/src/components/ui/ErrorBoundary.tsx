import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in FinFlow UI:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 text-center bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20]">
            <div className="w-12 h-12 rounded-xl bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-[var(--brand-950)]">
              Application Error Encountered
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              FinFlow UI caught an unhandled rendering error. The underlying journey ledger state remains safely persisted.
            </p>
            {this.state.error && (
              <pre className="mt-3 p-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[10px] text-left overflow-x-auto text-[var(--fin-coral)] font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
