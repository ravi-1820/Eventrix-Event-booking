import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Calendar, Clock, MapPin, Users, Ticket, Tag, Sparkles, 
  Check, ArrowRight, ShieldCheck, CreditCard, Utensils, 
  Armchair, Share2, Heart, Printer, AlertCircle, Star,
  ExternalLink, BadgeCheck, ChevronRight, Zap, X, Download, Loader2, Wallet,
  Minus, Plus, ChevronDown, CheckCircle2, ThumbsUp, MessageSquare
} from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../api/client';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';
import { loadRazorpayScript } from '../../lib/razorpay';
import { EVENTRIX_LOGO_DATA_URI } from '../../lib/logoBase64';
import { motion, AnimatePresence } from 'framer-motion';
import { VerifiedEventTicket } from '../tickets/VerifiedEventTicket';
import { useLanguage } from '../../context/LanguageContext';
import { getStoredReviews, saveReviews, getEventRatingSummary } from '../../lib/reviewsStorage';

const PLATFORM_FEE = 0;

// Ticket tier definitions — derived from event.ticket_price at runtime
function buildTiers(basePrice) {
  const base = parseFloat(basePrice) || 0;
  return [
    {
      id: 'GENERAL_ADMISSION',
      label: 'General Admission',
      description: 'Standard entry to the event',
      price: base,
      soldOut: false,
    },
    {
      id: 'VIP',
      label: 'VIP Access',
      description: 'Priority entry + exclusive lounge access',
      price: base * 2,
      soldOut: false,
    },
    {
      id: 'EARLY_BIRD',
      label: 'Early Bird',
      description: 'Discounted advance purchase',
      price: base * 0.75,
      soldOut: true, // Always sold out per PRD spec
    },
  ];
}

// Real Seat Availability Helper
function getSeatAvailabilityStatus(remainingSeats, totalCapacity) {
  const remaining = remainingSeats != null ? Number(remainingSeats) : null;
  const capacity = totalCapacity != null ? Number(totalCapacity) : null;

  if (remaining !== null && remaining <= 0) {
    return { 
      label: 'Sold Out', 
      badgeClass: 'bg-rose-600 text-white', 
      pulse: false,
      isSoldOut: true 
    };
  }
  if (remaining !== null && remaining <= 10) {
    return { 
      label: `Only ${remaining} Seats Left!`, 
      badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', 
      pulse: true,
      isSoldOut: false 
    };
  }
  if (remaining !== null) {
    return { 
      label: `${remaining} Seats Available`, 
      badgeClass: 'bg-emerald-600/95 text-white', 
      pulse: false,
      isSoldOut: false 
    };
  }
  return { 
    label: capacity ? `${capacity} Seats Available` : 'Admission Open', 
    badgeClass: 'bg-emerald-600/95 text-white', 
    pulse: false,
    isSoldOut: false 
  };
}

export function StitchEventDetailModal({
  isOpen,
  onClose,
  event: rawEvent,
  currentUser,
  onOpenAuth,
  onBookingSuccess,
  onNavigate,
}) {
  const { t, translateEvent, translateCity, translateVenue } = useLanguage();
  const event = translateEvent(rawEvent);
  const [selectedTierId, setSelectedTierId] = useState('GENERAL_ADMISSION');
  const [ticketCount, setTicketCount] = useState(1);
  const [dietary, setDietary] = useState('None');
  const [seating, setSeating] = useState('Standard');
  const [specialNotes, setSpecialNotes] = useState('');

  // Checkout Steps: 1 = Details & Preferences, 2 = Razorpay Payment, 3 = Confirmed Ticket Pass
  const [checkoutStep, setCheckoutStep] = useState(1);

  // Loyalty Discount state
  const [discountData, setDiscountData] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  // Payment state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const ticketRef = useRef(null);

  // UI state
  const [saved, setSaved] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const tiers = event ? buildTiers(event.ticket_price) : [];
  const selectedTier = tiers.find((t) => t.id === selectedTierId) || tiers[0];
  const isSoldOut = event?.remaining_seats === 0;
  const isFree = selectedTier ? selectedTier.price === 0 : false;

  // Reviews for this event
  const [reviewsList, setReviewsList] = useState(() => getStoredReviews());

  useEffect(() => {
    const handleSync = () => {
      setReviewsList(getStoredReviews());
    };
    window.addEventListener('eventrix:reviews_updated', handleSync);
    window.addEventListener('eventrix:new_review', handleSync);
    return () => {
      window.removeEventListener('eventrix:reviews_updated', handleSync);
      window.removeEventListener('eventrix:new_review', handleSync);
    };
  }, []);

  const eventRatingSummary = React.useMemo(() => {
    return getEventRatingSummary(rawEvent || event, reviewsList);
  }, [rawEvent, event, reviewsList]);

  const handleModalHelpfulUpvote = (reviewId, e) => {
    e?.stopPropagation();
    const updated = reviewsList.map(r => {
      if (r.id === reviewId) {
        return { ...r, helpful: (r.helpful || 0) + 1 };
      }
      return r;
    });
    setReviewsList(updated);
    saveReviews(updated);
  };

  // Reset state when a new event is opened
  useEffect(() => {
    if (isOpen && event) {
      setCheckoutStep(1);
      setSelectedTierId('GENERAL_ADMISSION');
      setTicketCount(1);
      setDietary('None');
      setSeating('Standard');
      setSpecialNotes('');
      setErrorMessage('');
      setConfirmedBooking(null);
      setWaitlistSubmitted(false);
      setWaitlistEmail('');
    }
  }, [isOpen, event?.id]);

  // Fetch discount preview whenever tier/qty changes
  useEffect(() => {
    if (isOpen && event && currentUser) {
      fetchDiscountPreview();
    }
  }, [isOpen, event, ticketCount, selectedTierId, currentUser]);

  // Body scroll lock + Esc key handler
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const fetchDiscountPreview = async () => {
    if (!selectedTier) return;
    try {
      setLoadingDiscount(true);
      const data = await api.calculateDiscount(event.id, ticketCount, selectedTier.price);
      setDiscountData(data);
    } catch (err) {
      console.error('Failed to compute discount preview:', err);
    } finally {
      setLoadingDiscount(false);
    }
  };

  // Pricing calculations
  const unitPrice = selectedTier?.price ?? 0;
  const subtotal = unitPrice * ticketCount;
  const loyaltyPercent = discountData?.discount_percentage ?? currentUser?.loyalty_discount_tier?.percentage ?? 0;
  const discountAmt = discountData?.discount_amount ?? (subtotal * loyaltyPercent) / 100;
  const afterDiscount = subtotal - discountAmt;
  const totalDue = isFree ? 0 : afterDiscount + PLATFORM_FEE;

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on Eventrix!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch (e) {}
  };

  const handleProceedToPayment = async () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    setErrorMessage('');
    try {
      setProcessingPayment(true);
      const res = await api.createBooking({
        event_id: event.id,
        quantity: ticketCount,
        dietary_preference: dietary,
        seating_preference: seating,
        special_requests: specialNotes,
        ticket_tier: selectedTierId,
        unit_price_override: unitPrice !== parseFloat(event.ticket_price) ? unitPrice : undefined,
      });

      const booking = res.booking;
      setConfirmedBooking(booking);

      if (!res.requires_payment) {
        const fullData = {
          ...booking,
          event_details: event,
          amount_paid: 0,
          payment_id: 'FREE_RSVP',
          status: 'CONFIRMED',
          ticket_tier: selectedTier.title || 'General Admission',
          quantity: ticketCount,
        };
        setConfirmedBooking(fullData);
        try {
          sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(fullData));
        } catch (e) {}
        onClose();
        if (onBookingSuccess) onBookingSuccess(fullData);
        return;
      }

      // If requires payment, navigate to Payment Method Selection page (Cash / Online)
      const pendingBooking = {
        ...booking,
        event_details: event,
      };

      try {
        sessionStorage.setItem('eventrix_payment_pending_booking', JSON.stringify(pendingBooking));
      } catch (e) {}

      setProcessingPayment(false);
      onClose();

      if (onNavigate) {
        onNavigate('payment-method', pendingBooking);
      } else {
        window.location.hash = '#payment-method';
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initiate booking');
      setProcessingPayment(false);
    }
  };


  const handlePayWithRazorpay = async (bookingToPay) => {
    const booking = bookingToPay || confirmedBooking;
    if (!booking) return;

    setErrorMessage('');
    setProcessingPayment(true);

    try {
      // 1. Dynamically load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment SDK. Please check your internet connection.');
      }

      // 2. Create authoritative order on backend
      const orderData = await api.createRazorpayOrder(booking.booking_id);

      // 3. Configure Razorpay checkout options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Eventrix',
        description: `Booking ${booking.booking_id} - ${event.title}`,
        image: EVENTRIX_LOGO_DATA_URI,
        order_id: orderData.order_id,
        prefill: {
          name: currentUser?.first_name 
            ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
            : (currentUser?.username || ''),
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
        notes: {
          booking_id: booking.booking_id,
          event_id: String(event.id),
        },
        theme: {
          color: '#075985',
        },
        handler: async function (response) {
          try {
            setProcessingPayment(true);
            const verifyRes = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: booking.booking_id,
            });

            const fullData = {
              ...booking,
              event_details: event,
              status: 'CONFIRMED',
              amount_paid: verifyRes.amount_paid ?? booking.total_price,
              payment_id: response.razorpay_payment_id || verifyRes.razorpay_payment_id,
              ticket_tier: selectedTier.title || 'General Admission',
              quantity: ticketCount,
            };
            setConfirmedBooking(fullData);
            try {
              sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(fullData));
            } catch (e) {}
            onClose();
            if (onBookingSuccess) onBookingSuccess(fullData);
          } catch (verifyErr) {
            setErrorMessage(verifyErr.message || 'Payment verification failed');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setErrorMessage(resp.error?.description || 'Payment was unsuccessful. You can retry with Razorpay.');
        setProcessingPayment(false);
      });
      rzp.open();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initiate Razorpay checkout.');
      setProcessingPayment(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current || downloadingPdf) return;
    try {
      setDownloadingPdf(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const printWidth = pageWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, 20, printWidth, printHeight);
      pdf.save(`Eventrix_Pass_${confirmedBooking?.booking_id || 'ticket'}.pdf`);
    } catch (e) {
      console.error('PDF download error:', e);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#075985', '#0284C7', '#FF4F70', '#38BDF8'],
      });
    } catch (e) {}
  };

  if (!event) return null;

  const totalCapacity = event?.capacity || 0;
  const bookedCount = event?.booked_count || 0;
  const remainingSeats = event?.remaining_seats != null 
    ? event.remaining_seats 
    : (totalCapacity > 0 ? Math.max(0, totalCapacity - bookedCount) : null);
  const seatStatus = getSeatAvailabilityStatus(remainingSeats, totalCapacity);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-4xl"
        className="p-0 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        aria-describedby="event-modal-dossier"
      >

        {/* ───────────────────────────────────────────────────
            STEP 1: EVENT DETAILS, TIER SELECTOR & CHECKOUT
        ─────────────────────────────────────────────────── */}
        {checkoutStep === 1 && (
          <div className="flex flex-col lg:flex-row h-full max-h-[88vh] overflow-y-auto">

            {/* ── LEFT: Media & Event Dossier ── */}
            <div className="lg:w-7/12 p-6 sm:p-8 space-y-6 overflow-y-auto">

              {/* Hero Photography */}
              <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden bg-slate-100 shadow-md group">
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />

                {/* Top-left: Category + Event Type badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/95 text-[#FF4F70] font-bold text-xs shadow-md backdrop-blur-md">
                    {event.category_details?.name || 'Featured Event'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#0F172A]/80 text-white font-semibold text-[11px] backdrop-blur-md">
                    {(event.event_type || '').replace('_', ' ')}
                  </span>
                </div>

                {/* Top-right: Save + Share */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setSaved((v) => !v)}
                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md transition-colors hover:bg-white"
                    aria-label="Save event"
                  >
                    <Heart
                      className={`w-4 h-4 transition-all duration-200 ${saved ? 'fill-[#FF4F70] text-[#FF4F70] scale-110' : 'text-slate-600'}`}
                    />
                  </motion.button>
                  <button
                    onClick={handleShare}
                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    aria-label="Share event"
                  >
                    <Share2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <AnimatePresence>
                    {shareCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-0 top-11 text-[10px] font-bold bg-[#0F172A] text-white px-2 py-1 rounded-lg whitespace-nowrap"
                      >
                        Link copied!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom-left: Real Available Seats Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 ${seatStatus.badgeClass} ${seatStatus.pulse ? 'animate-pulse' : ''}`}>
                    {seatStatus.isSoldOut ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (remainingSeats !== null && remainingSeats <= 10) ? (
                      <Zap className="w-3.5 h-3.5 fill-white" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{seatStatus.label}</span>
                  </span>

                  {totalCapacity > 0 && !seatStatus.isSoldOut && (
                    <span className="px-2.5 py-1.5 rounded-full bg-slate-900/80 text-slate-200 text-xs font-semibold backdrop-blur-md hidden sm:inline-flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#38BDF8]" />
                      Capacity: {totalCapacity}
                    </span>
                  )}
                </div>

                {/* Bottom-right: Real Attendance status */}
                <div className="absolute bottom-3 right-3">
                  <span className="px-3 py-1.5 rounded-full bg-white/95 text-slate-800 text-xs font-bold shadow-md backdrop-blur-md flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#075985]" />
                    <span>
                      {bookedCount > 0 ? `${bookedCount} Booked` : 'Open for Booking'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div id="event-modal-dossier">
                <h2
                  id="event-modal-title"
                  className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight font-['Plus_Jakarta_Sans']"
                >
                  {event.title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {/* Date & Time — single pill per PRD */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{t('modal.dateSchedule', 'Date & Time')}</span>
                      <span className="text-xs font-bold text-slate-800">
                        {formatDate(event.start_time)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Venue + "View on Map" */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="truncate min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{t('modal.venueLocation', 'Venue & Location')}</span>
                      <span className="text-xs font-bold text-slate-800 truncate block">{event.venue_name}</span>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {event.location_or_link}&nbsp;
                        <span className="text-[#075985] font-semibold inline-flex items-center gap-0.5 cursor-pointer hover:underline">
                          <ExternalLink className="w-2.5 h-2.5" />View Map
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* About This Event */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">{t('modal.aboutEvent', 'About This Event')}</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line line-clamp-5">
                  {event.description}
                </p>
              </div>

              {/* Organizer Profile Card — upgraded */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#E0F2FE] text-[#075985] font-extrabold flex items-center justify-center text-base shadow-inner">
                      {event.organizer_name ? event.organizer_name[0].toUpperCase() : 'E'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{event.organizer_name || 'Eventrix Verified Organizer'}</span>
                        <BadgeCheck className="w-4 h-4 text-[#075985]" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Event Organizer</span>
                    </div>
                  </div>
                  <Badge variant="coral">Verified Partner</Badge>
                </div>
                {/* Rating + Events Hosted */}
                <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                    ))}
                    <span className="text-[11px] font-bold text-slate-700 ml-0.5">4.9</span>
                  </div>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500 font-semibold">120+ events hosted</span>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500 font-semibold">4.2K followers</span>
                </div>
              </div>

              {/* ── VERIFIED ATTENDEE REVIEWS & RATINGS SECTION ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {t('modal.attendeeReviews', 'Attendee Reviews & Ratings')}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {eventRatingSummary.count > 0 
                          ? `${eventRatingSummary.count} verified reviews` 
                          : '100% Genuine Ticket Holders'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black font-mono">{eventRatingSummary.avgRating}</span>
                    <span className="text-[10px] text-amber-700 font-semibold">/ 5.0</span>
                  </div>
                </div>

                {/* Reviews List or Empty Note */}
                {eventRatingSummary.reviews.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-medium text-slate-600">
                      No attendee reviews for this session yet.
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Attend this event and share your feedback from <strong className="text-[#075985]">My Bookings</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {eventRatingSummary.reviews.map((rev) => (
                      <div 
                        key={rev.id}
                        className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#075985] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {(rev.author || 'A')[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {rev.author || 'Verified Attendee'}
                            </span>
                            <BadgeCheck className="w-3 h-3 text-[#075985] shrink-0" />
                          </div>

                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((s) => (
                              <Star 
                                key={s} 
                                className={`w-2.5 h-2.5 ${s <= Number(rev.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                          "{rev.comment}"
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>{rev.date || 'Recent'}</span>
                          <button
                            onClick={(e) => handleModalHelpfulUpvote(rev.id, e)}
                            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors font-semibold active:scale-95 cursor-pointer"
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            <span>Helpful ({rev.helpful || 0})</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Proof Chip */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] w-fit">
                <div className="flex -space-x-1">
                  {['A','B','C'].map((l, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-[#075985] text-white text-[8px] font-bold flex items-center justify-center border border-white">
                      {l}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-[#075985]">3 mutual friends are attending</span>
              </div>
            </div>

            {/* ── RIGHT: Ticket Selection & Checkout ── */}
            <div className="lg:w-5/12 bg-slate-50/80 p-6 sm:p-8 border-t lg:border-t-0 lg:border-l border-slate-200/90 flex flex-col gap-5">

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold font-['Plus_Jakarta_Sans'] text-slate-900">{t('modal.ticketsPricing', 'Select Tickets')}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                    Step 1 of 2
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Choose your admission tier and quantity.</p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── Ticket Tier Radio Selector ── */}
              <div className="space-y-2.5">
                {tiers.map((tier) => {
                  const isActive = selectedTierId === tier.id && !tier.soldOut;
                  return (
                    <button
                      key={tier.id}
                      disabled={tier.soldOut}
                      onClick={() => !tier.soldOut && setSelectedTierId(tier.id)}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
                        tier.soldOut
                          ? 'opacity-55 cursor-not-allowed bg-slate-100/60 border-slate-200'
                          : isActive
                            ? 'bg-[#E0F2FE]/40 border-[#075985] ring-2 ring-[#075985]/15 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio indicator */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'border-[#075985] bg-[#075985]' : 'border-slate-300 bg-white'
                          }`}>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-extrabold truncate ${isActive ? 'text-[#075985]' : 'text-slate-900'}`}>
                                {tier.label}
                              </span>
                              {tier.soldOut && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                                  Sold Out
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-medium block truncate mt-0.5">
                              {tier.description}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-extrabold font-mono text-slate-900 shrink-0 text-right ml-2" style={{ fontFeatureSettings: "'tnum' 1" }}>
                          {tier.price === 0 ? 'FREE' : formatCurrency(tier.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Quantity Stepper ── */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{t('modal.quantity', 'Quantity')}</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Max 8 tickets per booking
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 p-1 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    disabled={ticketCount <= 1}
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-xs border border-slate-200/80 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <motion.span
                    key={ticketCount}
                    initial={{ scale: 1.2, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-extrabold font-mono text-slate-900 w-6 text-center"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {ticketCount}
                  </motion.span>
                  <button
                    type="button"
                    disabled={ticketCount >= 8}
                    onClick={() => setTicketCount(Math.min(8, ticketCount + 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-xs border border-slate-200/80 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Preferences ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-[#FF4F70]" />
                  <span>Attendee Preferences</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-[#075985]" />
                    Dietary Catering
                  </label>
                  <div className="relative">
                    <select
                      value={dietary}
                      onChange={(e) => setDietary(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#075985] focus:ring-2 focus:ring-[#075985]/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="None">None (Standard Menu)</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Gluten-Free">Gluten-Free</option>
                      <option value="Halal">Halal</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5 text-[#075985]" />
                    Seating Placement
                  </label>
                  <div className="relative">
                    <select
                      value={seating}
                      onChange={(e) => setSeating(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#075985] focus:ring-2 focus:ring-[#075985]/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Standard">Standard Auditorium</option>
                      <option value="VIP Front Row">VIP Front Row</option>
                      <option value="Aisle Seat">Aisle Seat</option>
                      <option value="Accessible Seating">Wheelchair Accessible</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── Loyalty Discount Banner ── */}
              {loyaltyPercent > 0 && !isFree && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-400/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <span>{loyaltyPercent}% {t('modal.discount', 'Loyalty Discount')}</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Your loyalty status automatically deducts <strong>{loyaltyPercent}%</strong> from this booking.
                  </p>
                </div>
              )}

              {/* ── Itemized Fee Breakdown ── */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span className="font-medium">{t('modal.subtotal', 'Subtotal')} ({ticketCount} × {selectedTier?.label})</span>
                  <motion.span
                    key={subtotal}
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: 1 }}
                    className="font-mono font-bold text-slate-800"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {isFree ? 'FREE' : formatCurrency(subtotal)}
                  </motion.span>
                </div>

                {!isFree && (
                  <div className="flex justify-between text-slate-400">
                    <span>Platform & processing fee</span>
                    <span className="font-mono font-medium" style={{ fontFeatureSettings: "'tnum' 1" }}>
                      {formatCurrency(PLATFORM_FEE)}
                    </span>
                  </div>
                )}

                {loyaltyPercent > 0 && !isFree && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('modal.discount', 'Loyalty Reward')} (−{loyaltyPercent}%)
                    </span>
                    <motion.span
                      key={discountAmt}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      className="font-mono"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      −{formatCurrency(discountAmt)}
                    </motion.span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-extrabold font-['Plus_Jakarta_Sans'] text-slate-900">{t('modal.totalAmount', 'Total Payable')}</span>
                  <motion.span
                    key={totalDue}
                    initial={{ scale: 1.05, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-black font-mono text-[#075985]"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {isFree ? 'FREE' : formatCurrency(totalDue)}
                  </motion.span>
                </div>
              </div>

              {/* ── Primary CTA ── */}
              <div className="space-y-3 mt-auto">
                {isSoldOut ? (
                  /* ── Waitlist Flow ── */
                  <div className="space-y-3">
                    <div className="w-full py-4 rounded-xl bg-slate-200 text-slate-500 text-base font-bold text-center opacity-70 cursor-not-allowed select-none">
                      {t('card.soldOut', 'Sold Out')}
                    </div>
                    {!waitlistSubmitted ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 text-center">Join the waitlist — we'll notify you if a spot opens.</p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#075985]"
                          />
                          <button
                            onClick={() => setWaitlistSubmitted(true)}
                            className="px-4 py-2 rounded-xl bg-[#075985] text-white text-xs font-bold shrink-0 hover:bg-[#0369A1] active:scale-95 transition-all"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                        <Check className="w-4 h-4" />
                        You're on the waitlist! We'll email you at {waitlistEmail}.
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Normal CTA ── */
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={processingPayment || loadingDiscount}
                    onClick={handleProceedToPayment}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#FF4F70] text-white rounded-xl text-base font-bold shadow-xl shadow-[#FF4F70]/30 hover:bg-[#E11D48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPayment ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        {t('common.loading', 'Processing…')}
                      </span>
                    ) : (
                      <>
                        <span>
                          {isFree
                            ? t('card.free', 'Free Entry')
                            : `${t('modal.proceedToPay', 'Proceed to Checkout')} — ${formatCurrency(totalDue)}`}
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                )}

                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Secured by Razorpay · Cancel anytime before event
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────
            STEP 2: RAZORPAY CHECKOUT
        ─────────────────────────────────────────────────── */}
        {checkoutStep === 2 && (
          <div className="p-6 sm:p-10 max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#075985]/10 text-[#075985] flex items-center justify-center mx-auto shadow-inner ring-1 ring-[#075985]/20">
                <ShieldCheck className="w-8 h-8 text-[#075985]" />
              </div>
              <h3 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#0F172A]">Razorpay Secure Checkout</h3>
              <p className="text-xs text-slate-500">
                Pay securely via UPI (GPay, PhonePe, Paytm), Cards, NetBanking, or Wallets.
              </p>
            </div>

            {/* Total Pill */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Total Charge</span>
                <span className="text-3xl font-extrabold font-mono text-[#0F172A]" style={{ fontFeatureSettings: "'tnum' 1" }}>
                  {confirmedBooking ? formatCurrency(confirmedBooking.total_price) : formatCurrency(totalDue)}
                </span>
              </div>
              {loyaltyPercent > 0 && (
                <Badge variant="amber" className="text-xs font-bold py-1 px-3">
                  Loyalty −{loyaltyPercent}% Applied
                </Badge>
              )}
            </div>

            {/* Payment Details Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
                <span className="font-semibold uppercase tracking-wider text-slate-700">Payment Gateway</span>
                <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Razorpay Trusted
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Booking ID</span>
                  <span className="font-mono font-bold text-slate-900 truncate block">
                    {confirmedBooking?.booking_id || 'Generating...'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                  <span className="font-bold text-slate-900">{ticketCount} Ticket(s)</span>
                </div>
              </div>

              {/* Supported payment methods */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">Accepted Payment Methods</label>
                <div className="flex flex-wrap gap-1.5">
                  {['UPI (GPay / PhonePe / Paytm)', 'Credit / Debit Cards', 'Net Banking (All Indian Banks)', 'Wallets & Cred'].map((method) => (
                    <span key={method} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="md" onClick={() => setCheckoutStep(1)}>
                Back
              </Button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={processingPayment}
                onClick={() => handlePayWithRazorpay()}
                className="flex items-center justify-center h-12 px-7 bg-[#075985] text-white rounded-xl text-base font-bold shadow-xl shadow-[#075985]/30 disabled:opacity-50 hover:bg-[#0369A1] transition-all cursor-pointer"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Opening Razorpay…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2 fill-white" />
                    Pay {confirmedBooking ? formatCurrency(confirmedBooking.total_price) : formatCurrency(totalDue)} with Razorpay
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────
            STEP 3: OFFICIAL EVENTRIX BOARDING PASS
        ─────────────────────────────────────────────────── */}
        {checkoutStep === 3 && confirmedBooking && (
          <div className="p-6 sm:p-10 max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <Check className="w-8 h-8" />
              </span>
              <h3 className="text-2xl font-extrabold text-[#0F172A]">You're Confirmed! 🎉</h3>
              <p className="text-xs text-slate-500">Your digital pass is ready for admission.</p>
            </div>

            {/* Unified Reusable Verified Pass */}
            <div className="eventrix-print-area">
              <VerifiedEventTicket
                ref={ticketRef}
                booking={confirmedBooking}
                currentUser={currentUser}
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button 
                variant="outline" 
                size="md" 
                onClick={handleDownloadPdf} 
                disabled={downloadingPdf}
                className="gap-2 text-[#0F172A] border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#075985]" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button variant="primary" size="md" onClick={onClose} className="cursor-pointer">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
