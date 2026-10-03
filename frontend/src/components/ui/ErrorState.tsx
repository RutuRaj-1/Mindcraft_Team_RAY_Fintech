import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while fetching information from FinFlow AI engine.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center bg-white border-2 border-[var(--fin-coral)]/30 rounded-2xl shadow-xs max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--brand-950)]">
        {title}
      </h3>
      <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
};
