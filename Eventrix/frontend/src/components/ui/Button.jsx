import React from 'react';
import { cn } from '../../lib/utils';

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  ...props
}) {
  // Tactile press compression (scale: 0.98) adhering to Eventrix design playbook
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none font-sans";

  const variants = {
    // Eventrix Primary Deep Teal (#075985)
    primary: "bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 focus:ring-[#075985] border border-[#075985]/20",
    // Eventrix Coral Accent (#FF4F70)
    accent: "bg-[#FF4F70] hover:bg-[#E11D48] text-white shadow-md shadow-[#FF4F70]/25 focus:ring-[#FF4F70] border border-[#FF4F70]/30",
    // Secondary: Clean white surface + Light Blue border
    secondary: "bg-white hover:bg-[#E0F2FE]/60 text-[#075985] border border-[#BAE6FD] shadow-xs focus:ring-[#075985]",
    outline: "bg-white hover:bg-[#E0F2FE]/40 text-slate-700 border border-[#BAE6FD] shadow-xs focus:ring-[#075985]",
    ghost: "bg-transparent hover:bg-[#E0F2FE]/60 text-slate-700 hover:text-[#075985] focus:ring-[#075985]",
    danger: "bg-[#FF4F70] hover:bg-[#E11D48] text-white shadow-xs focus:ring-[#FF4F70]",
    dark: "bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-md focus:ring-slate-800",
    amber: "bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-md shadow-[#F59E0B]/20",
  };

  const sizes = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2.5 font-semibold",
    icon: "p-2.5 rounded-full",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
