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

// ── Part 41: Pre-Composed Professional Domain Skeletons ──────────────────────

/** Dashboard Loading Skeleton: Banner, 4 KPI cards, Chart & Case Queue */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Banner */}
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-3">
      <Skeleton variant="text" width="220px" height="24px" />
      <Skeleton variant="text" width="440px" height="16px" />
    </div>

    {/* 4 KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-5 bg-white border border-[var(--border)] rounded-2xl space-y-3 shadow-xs">
          <div className="flex justify-between items-center">
            <Skeleton variant="text" width="90px" height="12px" />
            <Skeleton variant="circle" width="28px" height="28px" />
          </div>
          <Skeleton variant="text" width="120px" height="28px" />
          <Skeleton variant="text" width="140px" height="10px" />
        </div>
      ))}
    </div>

    {/* 2-Column Split */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-4">
        <Skeleton variant="text" width="180px" height="18px" />
        <Skeleton variant="rect" height="240px" />
      </div>
      <div className="lg:col-span-4 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-3">
        <Skeleton variant="text" width="140px" height="18px" />
        <Skeleton variant="rect" height="60px" />
        <Skeleton variant="rect" height="60px" />
        <Skeleton variant="rect" height="60px" />
      </div>
    </div>
  </div>
);

/** Case List Loading Skeleton: Search & Filters, 6 Table Rows */
export const CaseListSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {/* Filter bar */}
    <div className="flex items-center justify-between gap-4">
      <Skeleton variant="rect" width="300px" height="40px" />
      <div className="flex gap-2">
        <Skeleton variant="rect" width="90px" height="40px" />
        <Skeleton variant="rect" width="90px" height="40px" />
      </div>
    </div>

    {/* Table rows */}
    <div className="card bg-white border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-xs">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton variant="circle" width="36px" height="36px" />
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Skeleton variant="text" width="60%" height="14px" />
              <Skeleton variant="text" width="40%" height="10px" />
            </div>
          </div>
          <Skeleton variant="text" width="100px" height="14px" />
          <Skeleton variant="rect" width="80px" height="24px" />
          <Skeleton variant="rect" width="70px" height="32px" />
        </div>
      ))}
    </div>
  </div>
);

/** Case Detail Loading Skeleton: Stepper & 14-Section Workspace */
export const CaseDetailSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton variant="text" width="160px" height="12px" />
          <Skeleton variant="text" width="280px" height="24px" />
        </div>
        <Skeleton variant="rect" width="120px" height="36px" />
      </div>
    </div>

    {/* Journey Stepper */}
    <div className="card p-4 bg-white border border-[var(--border)] rounded-2xl shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <Skeleton variant="circle" width="28px" height="28px" />
            <Skeleton variant="text" width="70%" height="10px" />
          </div>
        ))}
      </div>
    </div>

    {/* 2-Column Workspace */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <Skeleton variant="rect" height="180px" />
        <Skeleton variant="rect" height="220px" />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <Skeleton variant="rect" height="240px" />
        <Skeleton variant="rect" height="160px" />
      </div>
    </div>
  </div>
);

/** Evidence & Document Intelligence Loading Skeleton */
export const EvidenceSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 bg-white border border-[var(--border)] rounded-2xl space-y-2">
          <Skeleton variant="text" width="100px" height="12px" />
          <Skeleton variant="text" width="60px" height="24px" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-3">
        <Skeleton variant="text" width="160px" height="16px" />
        <Skeleton variant="rect" height="320px" />
      </div>
      <div className="lg:col-span-6 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-3">
        <Skeleton variant="text" width="180px" height="16px" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 bg-[var(--surface-subtle)] rounded-xl flex justify-between">
              <Skeleton variant="text" width="140px" height="12px" />
              <Skeleton variant="text" width="80px" height="12px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** OCR Layout & Visual Parsing Loading Skeleton */
export const OCRSkeleton: React.FC = () => (
  <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <Skeleton variant="text" width="180px" height="18px" />
        <Skeleton variant="text" width="260px" height="12px" />
      </div>
      <Skeleton variant="rect" width="90px" height="28px" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      <Skeleton variant="rect" height="260px" />
      <div className="space-y-3">
        <Skeleton variant="rect" height="60px" />
        <Skeleton variant="rect" height="60px" />
        <Skeleton variant="rect" height="60px" />
      </div>
    </div>
  </div>
);

/** Risk Engine & SHAP Loading Skeleton */
export const RiskSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Dial & Score Banner */}
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
      <div className="flex flex-col items-center space-y-2">
        <Skeleton variant="circle" width="110px" height="110px" />
        <Skeleton variant="text" width="100px" height="14px" />
      </div>
      <div className="md:col-span-2 space-y-3">
        <Skeleton variant="text" width="220px" height="20px" />
        <Skeleton variant="text" width="100%" height="12px" />
        <Skeleton variant="text" width="80%" height="12px" />
      </div>
    </div>

    {/* Hard Rules & SHAP waterfall */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-3">
        <Skeleton variant="text" width="180px" height="16px" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rect" height="42px" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-6 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-3">
        <Skeleton variant="text" width="180px" height="16px" />
        <Skeleton variant="rect" height="240px" />
      </div>
    </div>
  </div>
);

/** Explainable Decision Loading Skeleton */
export const DecisionSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Decision Banner */}
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton variant="text" width="140px" height="12px" />
          <Skeleton variant="text" width="260px" height="26px" />
        </div>
        <Skeleton variant="rect" width="140px" height="40px" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rect" height="60px" />
        ))}
      </div>
    </div>

    {/* Rationale & Citations */}
    <div className="card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-4">
      <Skeleton variant="text" width="160px" height="18px" />
      <Skeleton variant="text" width="100%" height="14px" />
      <Skeleton variant="text" width="90%" height="14px" />
      <div className="space-y-2 pt-2">
        <Skeleton variant="rect" height="70px" />
        <Skeleton variant="rect" height="70px" />
      </div>
    </div>
  </div>
);

/** Audit & Decision Replay Timeline Skeleton */
export const AuditSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-3">
      <Skeleton variant="text" width="240px" height="22px" />
      <Skeleton variant="text" width="400px" height="14px" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-4 bg-white border border-[var(--border)] rounded-xl space-y-2">
            <div className="flex justify-between">
              <Skeleton variant="text" width="120px" height="14px" />
              <Skeleton variant="text" width="60px" height="10px" />
            </div>
            <Skeleton variant="text" width="90%" height="12px" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-7 card p-6 bg-white border-2 border-[var(--border)] rounded-2xl">
        <Skeleton variant="rect" height="420px" />
      </div>
    </div>
  </div>
);

/** What-If Simulator Loading Skeleton */
export const WhatIfSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="card p-6 bg-white border-2 border-[var(--border)] rounded-2xl shadow-xs space-y-2">
      <Skeleton variant="text" width="200px" height="20px" />
      <Skeleton variant="text" width="360px" height="12px" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-4">
        <Skeleton variant="text" width="140px" height="16px" />
        <Skeleton variant="rect" height="48px" />
        <Skeleton variant="rect" height="48px" />
        <Skeleton variant="rect" height="48px" />
      </div>
      <div className="lg:col-span-7 card p-6 bg-white border border-[var(--border)] rounded-2xl space-y-4">
        <Skeleton variant="text" width="180px" height="16px" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="rect" height="140px" />
          <Skeleton variant="rect" height="140px" />
        </div>
      </div>
    </div>
  </div>
);
