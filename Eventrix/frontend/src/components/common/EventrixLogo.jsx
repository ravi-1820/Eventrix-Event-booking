import React from 'react';

export function EventrixLogo({ 
  variant = 'header', // 'header' | 'mark' | 'full'
  size = 'md',        // 'sm' | 'md' | 'lg'
  className = '',
  textColor = 'text-slate-900',
  subTextColor = 'text-slate-500'
}) {
  if (variant === 'full') {
    const sizeClasses = {
      sm: 'h-10',
      md: 'h-16',
      lg: 'h-24',
    };
    return (
      <img 
        src="/logo.png" 
        alt="Eventrix - Events Management System" 
        className={`${sizeClasses[size] || 'h-16'} w-auto object-contain ${className}`}
      />
    );
  }

  if (variant === 'mark') {
    const sizeClasses = {
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-12 w-12',
    };
    return (
      <img 
        src="/logo_mark.png" 
        alt="Eventrix Logo" 
        className={`${sizeClasses[size] || 'h-9 w-9'} object-contain ${className}`}
      />
    );
  }

  // Default 'header' layout: ribbon emblem + modern typography
  const markSizes = {
    sm: 'h-7',
    md: 'h-[38px]',
    lg: 'h-11',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-[19px]',
    lg: 'text-2xl',
  };

  const subTextSizes = {
    sm: 'text-[7.5px]',
    md: 'text-[8.5px]',
    lg: 'text-[10px]',
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <img 
        src="/logo_mark.png" 
        alt="Eventrix Mark" 
        className={`${markSizes[size] || 'h-[38px]'} w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03] drop-shadow-xs shrink-0`}
      />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-black ${textSizes[size] || 'text-[19px]'} tracking-[-0.02em] ${textColor} leading-none`}>
            EVENTRIX
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0"></span>
        </div>
        <span className={`font-bold ${subTextSizes[size] || 'text-[8.5px]'} ${subTextColor} uppercase tracking-[0.13em] mt-1 hidden xs:block sm:block`}>
          Events Management System
        </span>
      </div>
    </div>
  );
}
