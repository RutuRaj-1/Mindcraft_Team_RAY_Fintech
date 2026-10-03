import React from 'react';
import logoImg from '../../assets/Logo.jpeg';

export interface FinFlowLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  markOnly?: boolean;
  alt?: string;
}

const SIZE_MAP = {
  xs: 'h-7',
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-14',
  xl: 'h-20',
  custom: '',
};

export const FinFlowLogo: React.FC<FinFlowLogoProps> = ({
  size = 'md',
  className = '',
  markOnly = false,
  alt = 'FinFlow AI — Financial Journey Orchestration for MSMEs',
}) => {
  const heightClass = SIZE_MAP[size];

  if (markOnly) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl bg-white border border-[#E2E8F0] shadow-xs shrink-0 flex items-center justify-center ${
          size === 'xs' ? 'w-7 h-7' : size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11'
        } ${className}`}
        title="FinFlow AI"
      >
        <img
          src={logoImg}
          alt={alt}
          className="w-[240%] max-w-none -translate-x-[2%] -translate-y-[10%] object-contain"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={logoImg}
        alt={alt}
        className={`w-auto ${heightClass} object-contain transition-transform duration-200 select-none`}
        loading="eager"
        style={{ aspectRatio: '2 / 1' }}
      />
    </div>
  );
};
