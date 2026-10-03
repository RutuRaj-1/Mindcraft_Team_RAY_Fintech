import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'brutal' | 'subtle' | 'bordered' | 'metric';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  header,
  footer,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-[var(--border)] rounded-2xl shadow-xs',
    brutal: 'bg-white border-2 border-[var(--brand-950)] rounded-xl shadow-[3px_3px_0px_#0A1F20]',
    subtle: 'bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl',
    bordered: 'bg-white border-1.5 border-[var(--border-strong)] rounded-xl',
    metric: 'bg-white border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[var(--brand-300)] transition-all',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {header && (
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          {header}
        </div>
      )}
      <div className={padding !== 'none' ? paddingStyles[padding] : ''}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--surface-subtle)]/50 rounded-b-xl flex items-center justify-between gap-3">
          {footer}
        </div>
      )}
    </div>
  );
};
