import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'underline' | 'brutal';
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'segmented',
}) => {
  if (variant === 'segmented') {
    return (
      <div className="inline-flex p-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl gap-1">
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[var(--brand-900)] shadow-xs border border-[var(--border)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-[var(--brand-100)] text-[var(--brand-800)]'
                      : 'bg-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex border-b border-[var(--border)] gap-6">
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'border-[var(--brand-700)] text-[var(--brand-900)] font-bold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--surface-subtle)] border border-[var(--border)]">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
