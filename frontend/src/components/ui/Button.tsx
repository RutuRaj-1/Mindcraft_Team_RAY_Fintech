import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'brutal';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-[11px] gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-xs gap-2',
    lg: 'px-6 py-3 text-sm gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[var(--brand-700)] hover:bg-[var(--brand-800)] text-white shadow-xs border border-[var(--brand-800)]',
    secondary: 'bg-[var(--surface-subtle)] hover:bg-[var(--border)] text-[var(--brand-900)] border border-[var(--border-strong)] shadow-xs',
    danger: 'bg-[var(--fin-coral)] hover:bg-[#b53a2f] text-white border border-[#b53a2f] shadow-xs',
    success: 'bg-[var(--fin-green)] hover:bg-[#0c825b] text-white border border-[#0c825b] shadow-xs',
    outline: 'bg-white hover:bg-[var(--brand-50)] text-[var(--brand-700)] border-1.5 border-[var(--brand-700)]',
    ghost: 'bg-transparent hover:bg-[var(--brand-50)] text-[var(--brand-800)] border border-transparent',
    brutal: 'bg-[var(--brand-900)] hover:bg-[var(--brand-950)] text-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
