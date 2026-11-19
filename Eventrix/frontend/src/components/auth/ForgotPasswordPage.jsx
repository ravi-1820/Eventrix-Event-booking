import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { EventrixLogo } from '../common/EventrixLogo';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';

export function ForgotPasswordPage({ onNavigateHome, onOpenLogin }) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#E0F2FE]/40">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-slate-100 space-y-6">
        
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </button>

          <span className="text-[10px] font-bold uppercase tracking-widest text-[#075985] bg-[#E0F2FE] px-2.5 py-1 rounded-full border border-[#BAE6FD]">
            Account Recovery
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center flex flex-col items-center justify-center space-y-2 pt-2">
          <img 
            src="/logo_mark.png" 
            alt="Eventrix Logo" 
            className="h-14 w-auto object-contain drop-shadow-sm mb-1" 
          />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Forgot Password
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Recover access to your Eventrix account using email verification.
          </p>
        </div>

        {/* Step-by-Step Flow */}
        <ForgotPasswordFlow
          onBackToLogin={onOpenLogin}
          onSuccess={onOpenLogin}
        />

      </div>
    </div>
  );
}
