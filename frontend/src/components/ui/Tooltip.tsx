import React, { useState, useRef } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  maxWidth = 220,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  const positionStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow indicator
  const arrowStyles: Record<string, string> = {
    top: 'absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-[var(--brand-950)]',
    bottom: 'absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-[var(--brand-950)]',
    left: 'absolute top-1/2 -translate-y-1/2 left-full border-4 border-transparent border-l-[var(--brand-950)]',
    right: 'absolute top-1/2 -translate-y-1/2 right-full border-4 border-transparent border-r-[var(--brand-950)]',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`absolute z-[9999] pointer-events-none ${positionStyles[position]}`}
          style={{ maxWidth }}
        >
          <div className="relative px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[var(--brand-950)] rounded-lg shadow-lg leading-snug whitespace-normal break-words">
            {content}
            <span className={arrowStyles[position]} />
          </div>
        </div>
      )}
    </div>
  );
};
