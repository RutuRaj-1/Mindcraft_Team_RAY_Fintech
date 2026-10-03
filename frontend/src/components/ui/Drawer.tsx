import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0A1F20]/50 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        <div
          className={`w-screen ${widthStyles[width]} bg-white border-l-2 border-[var(--brand-950)] shadow-[-6px_0px_0px_rgba(10,31,32,0.15)] flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <div>
              <h3 className="text-base font-extrabold text-[var(--brand-950)] tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-950)] hover:bg-[var(--border)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
