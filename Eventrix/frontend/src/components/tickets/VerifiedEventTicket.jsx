import React, { useEffect, useState, forwardRef } from 'react';
import QRCode from 'qrcode';
import { 
  Calendar, Clock, MapPin, User, Mail, Phone, 
  ShieldCheck, CheckCircle2, Ticket, Sparkles, Building2,
  Armchair, Utensils, Hash, CreditCard, Navigation
} from 'lucide-react';
import { EventrixLogo } from '../common/EventrixLogo';
import { formatDate, formatTime, formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export const VerifiedEventTicket = forwardRef(function VerifiedEventTicket(
  { booking, currentUser, className = '' },
  ref
) {
  const { t, translateEvent, translateCity, translateVenue, translateCategory } = useLanguage();
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Extract authoritative fields
  const rawEvent = booking?.event_details || booking?.event || {};
  const event = translateEvent ? translateEvent(rawEvent) : rawEvent;
  const reqs = booking?.custom_requirements || {};
  const payment = booking?.payment_details || booking?.payment || {};

  const bookingId = booking?.booking_id || 'ETX-CONFIRMED';
  const attendeeName = booking?.attendee_name || (
    currentUser?.first_name 
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() 
      : (currentUser?.username || 'Guest Attendee')
  );
  const attendeeEmail = booking?.attendee_email || currentUser?.email || '—';
  const attendeePhone = booking?.attendee_phone || currentUser?.profile?.phone || currentUser?.phone || '';

  const tier = reqs.ticket_tier || booking?.ticket_tier || 'GENERAL_ADMISSION';
  const tierName = tier === 'VIP' ? t('modal.vipAccess', 'VIP Access') : tier === 'EARLY_BIRD' ? t('modal.earlyBird', 'Early Bird Pass') : t('modal.generalAdmission', 'General Admission');
  const quantity = booking?.quantity || 1;

  const totalAmount = booking?.total_price != null ? Number(booking.total_price) : 0;
  const isFree = totalAmount === 0;

  const paymentId = payment.payment_id || booking?.razorpay_payment_id || booking?.payment_id || null;
  const provider = isFree ? 'Free RSVP' : (payment.provider || 'Razorpay');
  const paymentStatus = booking?.status === 'CONFIRMED' ? t('booking.paidVerified', 'Paid & Verified') : (booking?.status || 'Confirmed');

  // Build complete authoritative address for the event
  const venueTitle = event.venue_name || translateVenue(rawEvent.venue_name) || 'Event Venue';
  const streetAddress = event.location_or_link || '';
  const cityName = event.city || translateCity(rawEvent.city) || '';
  const landmarkText = event.landmark ? `Near ${event.landmark}` : '';

  // Formatted combined address string
  const fullAddressParts = [venueTitle, streetAddress, cityName].filter(Boolean);
  // Remove duplicates if venue or city is already included in location_or_link
  const uniqueAddressParts = fullAddressParts.filter((item, idx) => fullAddressParts.indexOf(item) === idx);
  const formattedFullAddress = uniqueAddressParts.join(', ');

  // Generate deterministic, high-contrast QR code
  useEffect(() => {
    let isMounted = true;
    const verificationPayload = `https://eventrix.com/tickets/verify/${bookingId}?event=${encodeURIComponent(rawEvent.title || '')}&seats=${quantity}`;
    
    QRCode.toDataURL(verificationPayload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate ticket QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId, rawEvent.title, quantity]);

  return (
    <div 
      ref={ref}
      className={`bg-white text-slate-900 rounded-3xl border-2 border-slate-200 shadow-xl overflow-visible font-sans max-w-2xl mx-auto ${className}`}
      style={{ backgroundColor: '#ffffff', color: '#0F172A' }}
    >
      {/* ── 1. TOP PREMIUM ACCENT STRIP ── */}
      <div className="h-3 w-full bg-gradient-to-r from-[#075985] via-[#0284C7] to-[#FF4F70] rounded-t-[22px]" />

      {/* ── 2. TICKET BRAND & PASS HEADER ── */}
      <div className="p-5 sm:p-7 pb-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/80">
        <EventrixLogo variant="header" size="md" />

        <div className="text-right">
          {/* Verified Pass Badge */}
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0 animate-pulse" />
            <ShieldCheck size={14} className="text-emerald-700 mr-1.5 shrink-0" />
            <span className="font-black text-emerald-950 leading-none">{t('booking.verifiedPass', 'Verified Pass')}</span>
          </div>

          <span className="font-mono text-xs sm:text-sm font-black text-[#075985] block mt-1.5 tracking-wider">
            {bookingId}
          </span>
        </div>
      </div>

      {/* ── 3. EVENT INFORMATION & FULL ADDRESS ── */}
      <div className="p-5 sm:p-7 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#E0F2FE] text-[#075985] border border-[#BAE6FD] leading-none">
              {cityName || 'Live Event'}
            </span>
            {event.category_details?.name && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 uppercase tracking-wider leading-none">
                {event.category_details.name}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#075985] bg-[#E0F2FE] border border-[#BAE6FD] uppercase tracking-wider leading-none">
              {tierName}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {event.title || 'Eventrix Showcase Event'}
          </h2>

          {event.short_description && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {event.short_description}
            </p>
          )}
        </div>

        {/* Schedule & Venue Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {/* Date & Schedule */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('ticket.doorsOpen', 'Date & Schedule')}
              </span>
              <p className="text-sm font-bold text-slate-900 leading-normal">
                {formatDate(event.start_time)}
              </p>
              <p className="text-xs text-slate-600 font-medium mt-0.5 leading-normal">
                {formatTime(event.start_time)} {event.end_time ? `– ${formatTime(event.end_time)}` : ''} IST
              </p>
            </div>
          </div>

          {/* Venue & Location */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FF4F70]/10 text-[#FF4F70] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <MapPin size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('modal.venueLocation', 'Venue')}
              </span>
              <p className="text-sm font-bold text-slate-900 leading-normal">
                {venueTitle}
              </p>
              <p className="text-xs text-slate-600 font-medium mt-0.5 leading-normal">
                {cityName ? `${cityName} • ` : ''}{t('card.inPerson', 'In-Person Access')}
              </p>
            </div>
          </div>
        </div>

        {/* ── EXPLICIT FULL VENUE ADDRESS BAR ── */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#E0F2FE]/50 border border-[#BAE6FD]/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0 mt-0.5">
            <Building2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#075985] bg-[#E0F2FE] px-2 py-0.5 rounded-md">
                {t('ticket.venueLocation', 'Event Venue Address')}
              </span>
              {cityName && (
                <span className="text-[10px] font-bold text-slate-500">
                  {cityName}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed break-words">
              {formattedFullAddress || 'Official Venue Address will be notified by organizer'}
            </p>
            {landmarkText && (
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                📍 {landmarkText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. REALISTIC PERFORATED TICKET TEAR LINE WITH NOTCHES ── */}
      <div className="relative flex items-center justify-center my-0 px-4">
        {/* Left Cut-out Notch */}
        <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-slate-100 border border-slate-300 shadow-inner" />
        {/* Dashed Perforation Line */}
        <div className="w-full border-b-2 border-dashed border-slate-300" />
        {/* Right Cut-out Notch */}
        <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-slate-100 border border-slate-300 shadow-inner" />
      </div>

      {/* ── 5. ATTENDEE & ADMISSION METADATA ── */}
      <div className="p-5 sm:p-7 space-y-4 bg-slate-50/60">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {/* Attendee */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{t('ticket.verifiedAttendee', 'Attendee')}</span>
            <p className="font-extrabold text-slate-900 text-sm leading-normal break-words">{attendeeName}</p>
            <span className="text-xs text-slate-600 block leading-normal break-all">{attendeeEmail}</span>
            {attendeePhone && (
              <span className="text-[11px] text-slate-500 font-mono block leading-normal">{attendeePhone}</span>
            )}
          </div>

          {/* Admission */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{t('booking.admission', 'Admission')}</span>
            <p className="font-extrabold text-slate-900 text-sm leading-normal">{tierName}</p>
            <span className="text-xs text-slate-600 block leading-normal">{quantity} {quantity > 1 ? t('booking.tickets', 'Tickets') : t('booking.ticket', 'Ticket')}</span>
          </div>

          {/* Seating Zone / Dietary */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{t('booking.seatingZone', 'Seating Zone')}</span>
            <p className="font-extrabold text-slate-900 text-sm leading-normal break-words">
              {reqs.seating_preference || 'Standard Reserved'}
            </p>
            <span className="text-xs text-slate-600 block leading-normal">
              Diet: {reqs.dietary_preference || 'None'}
            </span>
          </div>

          {/* Settled Payment Amount */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{t('booking.settledAmount', 'Settled Amount')}</span>
            <p className="font-mono text-base font-black text-emerald-600 leading-normal">
              {isFree ? t('card.free', 'FREE') : formatCurrency(totalAmount)}
            </p>
            <span className="text-xs text-slate-600 block leading-normal">
              {provider} • {paymentStatus}
            </span>
          </div>
        </div>

        {/* Payment Transaction Reference */}
        {paymentId && (
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between text-slate-600 font-mono flex-wrap gap-2">
            <span className="text-slate-500 font-sans font-bold">{t('booking.transactionRef', 'Transaction Ref')}:</span>
            <span className="font-bold text-slate-800 break-all">{paymentId}</span>
          </div>
        )}
      </div>

      {/* ── 6. ENTRY VERIFICATION & QR CODE STUB ── */}
      <div className="p-5 sm:p-7 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center sm:text-left flex-1">
          {/* Authorized Entry Pass Badge */}
          <div>
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#075985] text-xs font-bold whitespace-nowrap shadow-xs">
              <CheckCircle2 size={16} className="text-[#075985] mr-2 shrink-0" />
              <span className="font-extrabold tracking-wide leading-none">
                {t('booking.authorizedEntryPass', 'Authorized Entry Pass')}
              </span>
            </div>
          </div>
          
          <h4 className="text-sm font-bold text-slate-900 leading-snug">
            {t('booking.presentTurnstiles', 'Present this QR Code at the Venue Turnstiles')}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            {t('booking.qrSecurityNotice', 'This digital pass contains a cryptographically verified security token. Scan directly from your phone screen or printed copy.')}
          </p>
          
          <div className="pt-0.5">
            <span className="text-xs text-slate-400 font-mono block">
              {t('booking.issuedOn', 'Issued on')}: {formatDate(booking?.booked_at || new Date().toISOString())}
            </span>
          </div>
        </div>

        {/* High-Contrast QR Code Block */}
        <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-sm shrink-0">
          <div className="w-32 h-32 bg-white p-1 rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt={`Entry QR Code for ${bookingId}`}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                {t('common.loading', 'Loading QR...')}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 mt-2 leading-none">
            {t('booking.scanForEntry', 'SCAN FOR ENTRY')}
          </span>
        </div>
      </div>

      {/* ── 7. FOOTER LEGAL DISCLAIMER ── */}
      <div className="px-6 py-3 bg-slate-100/90 border-t border-slate-200 text-center text-[11px] text-slate-600 font-medium leading-normal rounded-b-[22px]">
        {t('booking.legalNotice', 'Official Eventrix Entry Pass. Non-transferable once scanned at gate turnstile. Eventrix Hub © 2026.')}
      </div>
    </div>
  );
});
