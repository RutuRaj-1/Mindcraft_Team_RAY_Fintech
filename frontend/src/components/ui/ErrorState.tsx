import React from 'react';
import {
  AlertCircle, RefreshCw, Lock, ShieldAlert, FileQuestion,
  GitBranch, Clock, WifiOff, ServerCrash, LogIn
} from 'lucide-react';
import { Button } from './Button';
import { ApiError, getUserFriendlyErrorMessage } from '../../api/client';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  statusCode?: number;
  onRetry?: () => void;
  onSignIn?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  statusCode: propStatusCode,
  onRetry,
  onSignIn,
  className = '',
}) => {
  // Extract status code if error is ApiError
  const statusCode =
    propStatusCode || (error instanceof ApiError ? error.statusCode : undefined);

  // Derive friendly user message, guaranteeing NO raw stack traces or internal backend details
  const displayMessage =
    message || (error ? getUserFriendlyErrorMessage(error) : 'Something went wrong while processing the request.');

  // Derive title based on status code
  const displayTitle =
    title ||
    (statusCode === 401
      ? 'Authentication Required'
      : statusCode === 403
      ? 'Access Restricted'
      : statusCode === 404
      ? 'Case or Resource Not Found'
      : statusCode === 409
      ? 'Journey State Conflict'
      : statusCode === 422
      ? 'Unprocessable Submission'
      : statusCode === 429
      ? 'Rate Limit Exceeded'
      : statusCode && statusCode >= 500
      ? 'Service Interruption'
      : 'Operation Incomplete');

  // Derive icon & color scheme
  const getIconConfig = () => {
    switch (statusCode) {
      case 401:
        return {
          icon: Lock,
          color: '#d97706',
          bg: '#fef3c7',
          border: '#fde68a',
          badge: 'HTTP 401 · Unauthorized',
        };
      case 403:
        return {
          icon: ShieldAlert,
          color: 'var(--fin-coral)',
          bg: 'var(--fin-coral-bg)',
          border: 'rgba(239,68,68,0.3)',
          badge: 'HTTP 403 · Forbidden',
        };
      case 404:
        return {
          icon: FileQuestion,
          color: '#64748b',
          bg: '#f1f5f9',
          border: '#cbd5e1',
          badge: 'HTTP 404 · Not Found',
        };
      case 409:
        return {
          icon: GitBranch,
          color: '#b45309',
          bg: '#fef3c7',
          border: '#fde68a',
          badge: 'HTTP 409 · State Conflict',
        };
      case 429:
        return {
          icon: Clock,
          color: '#7c3aed',
          bg: '#ede9fe',
          border: '#ddd6fe',
          badge: 'HTTP 429 · Throttled',
        };
      case 502:
      case 503:
        return {
          icon: ServerCrash,
          color: 'var(--fin-coral)',
          bg: 'var(--fin-coral-bg)',
          border: 'rgba(239,68,68,0.3)',
          badge: `HTTP ${statusCode} · Gateway Unavailable`,
        };
      default:
        if (statusCode === 0) {
          return {
            icon: WifiOff,
            color: 'var(--fin-coral)',
            bg: 'var(--fin-coral-bg)',
            border: 'rgba(239,68,68,0.3)',
            badge: 'Network Connection Lost',
          };
        }
        return {
          icon: AlertCircle,
          color: 'var(--fin-coral)',
          bg: 'var(--fin-coral-bg)',
          border: 'rgba(239,68,68,0.3)',
          badge: statusCode ? `HTTP ${statusCode} · Engine Error` : 'Platform Notice',
        };
    }
  };

  const { icon: Icon, color, bg, border, badge } = getIconConfig();

  return (
    <div
      className={`p-7 text-center bg-white border-2 border-[var(--border)] shadow-[4px_4px_0px_#0A1F20] rounded-2xl max-w-lg mx-auto ${className}`}
    >
      {/* Icon Badge */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs border"
        style={{ backgroundColor: bg, color: color, borderColor: border }}
      >
        <Icon className="w-6 h-6" />
      </div>

      {/* Status Badge */}
      <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] mb-2">
        {badge}
      </span>

      <h3 className="text-base font-black text-[var(--brand-950)] tracking-tight">
        {displayTitle}
      </h3>

      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-medium">
        {displayMessage}
      </p>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-center gap-3">
        {statusCode === 401 && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSignIn || (() => (window.location.href = '/login'))}
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
          >
            Sign In Again
          </Button>
        )}

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Connection
          </Button>
        )}
      </div>
    </div>
  );
};
