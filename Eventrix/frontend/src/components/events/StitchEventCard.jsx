import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ArrowRight, Star, Ticket } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { getEventRatingSummary } from '../../lib/reviewsStorage';

// Helper to extract stylish Ticket-Pass date typography
const getEventDateParts = (dateStr) => {
  if (!dateStr) return { month: 'SEP', day: '28', weekday: 'MON', time: '7:00 PM' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: 'SEP', day: '28', weekday: 'MON', time: '7:00 PM' };
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
};

export function StitchEventCard({ event: rawEvent, onOpenDetails, currentUser }) {
  const { t, translateEvent } = useLanguage();
  const event = translateEvent(rawEvent);
  const ratingSummary = React.useMemo(() => getEventRatingSummary(rawEvent), [rawEvent]);
  const isFree = parseFloat(event.ticket_price) === 0;
  const originalPrice = parseFloat(event.ticket_price);
  const loyaltyPercent = currentUser?.loyalty_discount_tier?.percentage || 0;
  const discountedPrice = loyaltyPercent > 0 && !isFree
    ? originalPrice * (1 - loyaltyPercent / 100)
    : originalPrice;

  const dateParts = getEventDateParts(event.start_time || event.start_date);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-[#BAE6FD] shadow-sm hover:shadow-2xl hover:shadow-[#075985]/12 transition-all flex flex-col justify-between font-sans relative"
    >
      {/* ── TICKET NOTCH CUTOUTS (Physical Pass Effect) ── */}
      <div className="absolute -left-3.5 top-[204px] w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200/90 z-20 shadow-inner pointer-events-none" />
      <div className="absolute -right-3.5 top-[204px] w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200/90 z-20 shadow-inner pointer-events-none" />

      <div>
        {/* Media Header */}
        <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
          <img
            src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-black/25 to-black/20" />

          {/* Left: Holographic Date Pass Chip */}
          <div className="absolute top-3.5 left-3.5 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-md border border-white/40">
            <span className="text-[10px] font-black text-[#FF4F70] uppercase tracking-wider leading-none">
              {dateParts.month}
            </span>
            <span className="text-xl font-black font-mono text-[#0F172A] leading-tight mt-0.5">
              {dateParts.day}
            </span>
          </div>

          {/* Right: Category Pill */}
          <div className="absolute top-3.5 right-3.5">
            <span className="px-3 py-1 rounded-full bg-black/50 text-white font-extrabold text-xs shadow-sm backdrop-blur-md border border-white/20">
              {event.category_details?.name || "Event"}
            </span>
          </div>

          {/* Remaining Capacity & Rating Bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {event.remaining_seats ?? 50} {t('card.seatsLeft', 'spots left')}
            </span>
            <span className="px-2 py-1 rounded-lg bg-black/60 text-amber-400 text-[11px] font-bold backdrop-blur-md flex items-center gap-1 border border-white/10 shadow-xs">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{ratingSummary.avgRating}</span>
              {ratingSummary.count > 0 && (
                <span className="text-white/70 text-[10px] font-normal">({ratingSummary.count})</span>
              )}
            </span>
          </div>
        </div>

        {/* Perforated Divider Line with Notches */}
        <div className="relative border-b-2 border-dashed border-slate-200 mx-4" />

        {/* Content Body */}
        <div className="p-5 space-y-2">
          <h3 className="text-base font-extrabold text-[#0F172A] group-hover:text-[#075985] transition-colors line-clamp-2 leading-snug">
            {event.title}
          </h3>

          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#075985] shrink-0" />
            <span className="truncate">{event.venue_name} ({event.city})</span>
          </p>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
            {event.short_description || event.description}
          </p>
        </div>
      </div>

      {/* Footer Price & Action */}
      <div className="p-5 pt-0 mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('card.from', 'Pass Price')}</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            {loyaltyPercent > 0 && !isFree ? (
              <>
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formatCurrency(originalPrice)}
                </span>
                <span className="text-base font-black font-mono text-[#075985]">
                  {formatCurrency(discountedPrice)}
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#E0F2FE] text-[#075985] px-1.5 rounded">
                  -{loyaltyPercent}%
                </span>
              </>
            ) : (
              <span className="text-lg font-black font-mono text-[#0F172A]">
                {isFree ? t('card.free', 'FREE') : formatCurrency(originalPrice)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenDetails(event)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF4F70] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white text-xs font-bold shadow-md shadow-[#FF4F70]/25 hover:shadow-lg hover:shadow-[#FF4F70]/35 transition-all active:scale-95 cursor-pointer"
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>{t('card.bookNow', 'Book Pass')}</span>
        </button>
      </div>
    </motion.div>
  );
}
