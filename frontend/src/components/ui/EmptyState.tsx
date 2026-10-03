import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center bg-white border border-[var(--border)] rounded-2xl shadow-xs max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] text-[var(--brand-700)] flex items-center justify-center mx-auto mb-3">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-extrabold text-[var(--brand-950)]">
        {title}
      </h3>
      <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
