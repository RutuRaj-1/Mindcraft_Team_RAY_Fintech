import React from 'react';

export type BadgeVariant = 'teal' | 'green' | 'amber' | 'coral' | 'violet' | 'blue' | 'neutral' | 'brutal';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'teal',
  size = 'sm',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2.5 py-0.5 text-[10px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-1.5',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    teal: 'bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]',
    green: 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/25',
    amber: 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/25',
    coral: 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/25',
    violet: 'bg-[var(--fin-violet-bg)] text-[var(--fin-violet)] border border-[var(--fin-violet)]/25',
    blue: 'bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/25',
    neutral: 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-strong)]',
    brutal: 'bg-white text-[var(--brand-950)] border-1.5 border-[var(--brand-950)] font-bold shadow-[1px_1px_0px_#0A1F20]',
  };

  const dotColors: Record<BadgeVariant, string> = {
    teal: 'bg-[var(--brand-600)]',
    green: 'bg-[var(--fin-green)]',
    amber: 'bg-[var(--fin-amber)]',
    coral: 'bg-[var(--fin-coral)]',
    violet: 'bg-[var(--fin-violet)]',
    blue: 'bg-[var(--fin-blue)]',
    neutral: 'bg-[var(--text-muted)]',
    brutal: 'bg-[var(--brand-950)]',
  };

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-md uppercase whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
