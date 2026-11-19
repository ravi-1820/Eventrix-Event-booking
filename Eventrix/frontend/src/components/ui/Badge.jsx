import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, variant = 'default', className = '', ...props }) {
  const variants = {
    default: "bg-white text-slate-700 border-[#BAE6FD] font-medium",
    coral: "bg-[#FF4F70]/10 text-[#FF4F70] border-[#FF4F70]/25 font-semibold",
    teal: "bg-[#E0F2FE] text-[#075985] border-[#BAE6FD] font-semibold",
    indigo: "bg-[#E0F2FE] text-[#075985] border-[#BAE6FD] font-semibold",
    violet: "bg-[#E0F2FE] text-[#075985] border-[#BAE6FD] font-semibold",
    amber: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    rose: "bg-[#FF4F70]/10 text-[#FF4F70] border-[#FF4F70]/25 font-semibold",
    dark: "bg-[#0F172A]/90 text-white border-slate-700 backdrop-blur-md font-medium",
    price: "bg-white text-[#075985] border-[#BAE6FD] shadow-xs font-bold font-mono",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border select-none transition-colors",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
