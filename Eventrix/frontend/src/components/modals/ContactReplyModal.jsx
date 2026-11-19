import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, User, ShieldCheck, Clock, X, 
  Send, CheckCircle2, Copy, Check, ArrowLeft 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function ContactReplyModal({
  isOpen,
  message,
  onClose,
  showToast,
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(message.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (showToast) showToast(`Copied Ref: ${message.id}`);
  };

  const replies = message.replies || [];

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Full Viewport Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 overflow-hidden my-auto max-h-[88vh] flex flex-col z-10"
        >
          {/* Modal Header */}
          <div className="px-6 py-4.5 sm:py-5 bg-gradient-to-r from-sky-50 via-white to-blue-50/60 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#075985] text-white flex items-center justify-center shadow-md shadow-[#075985]/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {t('notifications.adminReplyTitle', 'Admin Support Response')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    {message.status || 'REPLIED'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="group inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#075985] transition-colors cursor-pointer"
                    title="Click to copy tracking ID"
                  >
                    <span>{t('notifications.inquiryRef', 'Ref')}: <strong className="font-mono text-slate-700">{message.id}</strong></span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#075985]" />}
                  </button>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                    {message.inquiryType || 'Inquiry'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-100">
            {/* User Original Message Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {message.name || 'You'} <span className="font-normal text-slate-500">({message.email})</span>
                    </h4>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {message.createdAt ? new Date(message.createdAt).toLocaleDateString() : 'Recent'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
                <p className="font-bold text-slate-900 mb-1">
                  Subject: {message.subject || message.inquiryType}
                </p>
                <p className="whitespace-pre-wrap text-slate-700">{message.message}</p>
              </div>
            </div>

            {/* Admin Official Replies Section */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  {t('notifications.officialResponses', 'Official Eventrix Responses')} ({replies.length})
                </h4>
              </div>

              {replies.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-amber-900">
                    {t('notifications.replyPending', 'Your inquiry is currently being reviewed by our concierge team.')}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    {t('notifications.replyTimeEstimate', 'Typical reply turnaround is under 2-4 hours.')}
                  </p>
                </div>
              ) : (
                replies.map((rep, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 rounded-2xl bg-gradient-to-br from-sky-50/95 via-[#F0F9FF] to-blue-50/75 border border-sky-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-[#075985] text-white flex items-center justify-center font-extrabold text-[11px] shadow-xs">
                          EX
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#075985]">
                            {rep.sender || 'Eventrix Support Team'}
                          </p>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                            {t('notifications.verifiedStaff', 'Verified Eventrix Staff')}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {rep.date ? new Date(rep.date).toLocaleString() : 'Just now'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal bg-white/85 p-4 rounded-xl border border-sky-100 shadow-2xs">
                      {rep.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <p className="text-[11px] text-slate-500 max-w-[380px] leading-tight">
              {t('notifications.needMoreHelp', 'Need additional assistance? You can submit another message anytime on the Contact page.')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#075985] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {t('common.close', 'Done')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
