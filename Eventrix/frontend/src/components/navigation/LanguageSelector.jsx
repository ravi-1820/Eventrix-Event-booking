import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function LanguageSelector({ variant = 'desktop', className = '' }) {
  const { language, setLanguage, languages, currentLanguageObj } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // Compact mobile inline mode (e.g. inside mobile dropdown menu)
  if (variant === 'mobile-inline') {
    return (
      <div className={`flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 ${className}`}>
        {languages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLanguage(lang.code)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                isActive
                  ? 'bg-white text-[#075985] shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang.nativeLabel}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
      {/* Compact Selector Button: [ 🌐 EN ▾ ] */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select Language"
        className={`h-[42px] px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 sm:gap-2 text-[13px] font-semibold transition-all duration-150 cursor-pointer select-none ${
          isOpen
            ? 'bg-[#F0F9FF] text-[#075985] border border-[#BAE6FD] shadow-xs ring-2 ring-[#075985]/10'
            : 'bg-white text-slate-700 hover:text-[#075985] hover:bg-[#F0F9FF] border border-slate-200/70 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <span className="material-symbols-outlined text-[19px] text-[#075985] shrink-0">
          language
        </span>
        <span className="font-bold tracking-tight uppercase">
          {currentLanguageObj.short}
        </span>
        <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#075985]' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Select Language
            </span>
          </div>

          <div className="px-1 flex flex-col gap-0.5">
            {languages.map((lang) => {
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#E0F2FE]/80 text-[#075985] font-bold shadow-2xs'
                      : 'text-slate-700 hover:text-[#075985] hover:bg-[#F0F9FF] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {lang.nativeLabel}
                    </span>
                    {lang.code !== 'en' && (
                      <span className="text-[10px] text-slate-400">
                        ({lang.label})
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] text-[#075985] font-bold">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
