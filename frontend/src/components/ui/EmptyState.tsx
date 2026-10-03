import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`
      flex flex-col items-center text-center
      bg-white border-2 border-dashed border-[var(--border-strong)]
      rounded-2xl transition-all
      ${compact ? 'p-6' : 'p-10 sm:p-12'}
      ${className}
    `}>
      {/* Icon container */}
      <div className={`
        rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)]
        flex items-center justify-center text-[var(--brand-700)] mb-4
        ${compact ? 'w-10 h-10' : 'w-14 h-14'}
      `}>
        {icon || <FolderOpen className={compact ? 'w-5 h-5' : 'w-7 h-7'} />}
      </div>

      <h3 className={`font-extrabold text-[var(--brand-950)] tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
        {title}
      </h3>
      <p className={`text-[var(--text-muted)] mt-1.5 leading-relaxed max-w-sm ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex items-center gap-3 justify-center flex-wrap">
          {actionLabel && onAction && (
            <Button variant="primary" size={compact ? 'xs' : 'sm'} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <Button variant="outline" size={compact ? 'xs' : 'sm'} onClick={onSecondaryAction}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
