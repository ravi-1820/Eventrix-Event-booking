import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Ticket, Calendar, MapPin, User, Mail, CreditCard, 
  Clock, ShieldCheck, CheckCircle2, RotateCcw, AlertCircle, Copy, Check
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export function BookingDetailDrawer({ booking, isOpen, onClose, onStatusChange, showToast }) {
  const { t, translateEvent } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !booking) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (showToast) showToast(t('admin.bookings.copiedToClipboard', 'Copied to clipboard'));
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'CONFIRMED': return t('admin.common.confirmed', 'CONFIRMED');
      case 'CANCELLED': return t('admin.common.cancelled', 'CANCELLED');
      case 'PENDING': return t('admin.common.pending', 'PENDING');
      default: return st;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('admin.bookings.drawerTitle', 'Booking Details')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' :
                  booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {getStatusLabel(booking.status)}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 font-mono mt-0.5 flex items-center gap-1.5">
                <span>{booking.booking_id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(booking.booking_id)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title="Copy code"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* 1. Customer Information */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('admin.bookings.customerInfo', 'Customer Information')}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  {booking.attendee_name ? booking.attendee_name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{booking.attendee_name}</p>
                  <p className="text-xs text-slate-500">{booking.attendee_email || t('admin.bookings.noEmail', 'No email provided')}</p>
                </div>
              </div>
            </div>

            {/* 2. Event Information */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('admin.bookings.eventInfo', 'Event Information')}
              </span>
              <p className="font-bold text-slate-900 text-sm leading-snug">
                {translateEvent({ title: booking.event_title }).title || booking.event_title}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={14} className="text-indigo-600" />
                <span>{t('admin.bookings.bookedOn', 'Booked on:')} {formatDate(booking.booked_at)}</span>
              </div>
            </div>

            {/* 3. Ticket & Pricing Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('admin.bookings.pricingBreakdown', 'Ticket & Pricing Breakdown')}
              </span>
              
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{t('admin.bookings.ticketsReserved', 'Tickets Reserved:')}</span>
                  <span className="font-bold text-slate-900 font-mono">{booking.quantity} {t('admin.bookings.standardPass', 'Standard Pass')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.bookings.unitPrice', 'Unit Price:')}</span>
                  <span className="font-mono">{formatCurrency(booking.unit_price || 0)}</span>
                </div>
                {booking.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{t('admin.bookings.loyaltyDiscount', 'Loyalty Discount:')}</span>
                    <span className="font-mono">-{formatCurrency(booking.discount_amount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>{t('admin.bookings.totalSettled', 'Total Settled:')}</span>
                  <span className="font-mono text-indigo-600">
                    {booking.total_price === 0 ? t('admin.common.free', 'FREE') : formatCurrency(booking.total_price)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Payment Information */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('admin.bookings.paymentGateway', 'Payment Method & Gateway')}
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{t('admin.bookings.provider', 'Provider:')}</span>
                <span className="font-bold text-slate-900 font-mono">
                  {booking.total_price === 0 ? t('admin.bookings.freeRsvpGateway', 'Free RSVP Gateway') : 'Razorpay Secure'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{t('admin.bookings.currency', 'Currency:')}</span>
                <span className="font-mono font-bold text-slate-900">INR (₹)</span>
              </div>
            </div>

            {/* 5. Booking Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('admin.bookings.bookingTimeline', 'Booking Timeline')}
              </span>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100" />
                  <p className="text-xs font-bold text-slate-900">{t('admin.bookings.timelineInitiated', 'Booking Initiated & Verified')}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(booking.booked_at)}</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-100" />
                  <p className="text-xs font-bold text-slate-900">{t('admin.bookings.timelineQrGenerated', 'QR Entry Pass Generated')}</p>
                  <p className="text-[11px] text-slate-500">{t('admin.bookings.timelineDelivered', 'Delivered to attendee profile')}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            {booking.status !== 'CANCELLED' ? (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(booking, 'CANCELLED');
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                {t('admin.bookings.cancelReservation', 'Cancel Reservation')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(booking, 'CONFIRMED');
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                {t('admin.bookings.reconfirmBooking', 'Re-confirm Booking')}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
