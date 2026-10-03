import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-3.5 rounded-md',
    rect: 'rounded-xl',
    circle: 'rounded-full',
  };

  return (
    <div
      className={`bg-[var(--border)] animate-pulse ${variantStyles[variant]} ${className}`}
      style={{
        width: width ?? (variant === 'circle' ? '40px' : '100%'),
        height: height ?? (variant === 'circle' ? '40px' : undefined),
        ...style,
      }}
      {...props}
    />
  );
};
