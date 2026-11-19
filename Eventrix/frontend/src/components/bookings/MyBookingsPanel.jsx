import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Clock, MapPin, CheckCircle2, 
  XCircle, AlertCircle, Ticket, 
  RefreshCw, AlertTriangle, Eye, CreditCard, Loader2, Plus,
  Star, Send, X, ShieldCheck, Sparkles, MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { TicketPassModal } from '../modals/TicketPassModal';
import { api } from '../../api/client';
import { formatDate, formatTime, formatCurrency } from '../../lib/utils';
import { loadRazorpayScript } from '../../lib/razorpay';
import { useLanguage } from '../../context/LanguageContext';

export function MyBookingsPanel({
  currentUser,
  onOpenAuth,
  onOpenDetails,
  onNavigate,
  showToast
}) {
  const { t, translateEvent } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals & Payment state
  const [selectedTicketBooking, setSelectedTicketBooking] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [paymentFailedBookingId, setPaymentFailedBookingId] = useState(null);

  // Reviews tracking state
  const [reviews, setReviews] = useState(() => {
    try {
      const stored = localStorage.getItem('eventrix_event_reviews');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Review Modal state
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAuthorName, setReviewAuthorName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem('eventrix_event_reviews');
        if (stored) setReviews(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('eventrix:reviews_updated', handleSync);
    window.addEventListener('eventrix:new_review', handleSync);
    return () => {
      window.removeEventListener('eventrix:reviews_updated', handleSync);
      window.removeEventListener('eventrix:new_review', handleSync);
    };
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load user bookings:', err);
      setError('Unable to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user bookings
  useEffect(() => {
    if (currentUser) {
      loadBookings();
    } else {
      setLoading(false);
      setBookings([]);
    }
  }, [currentUser, loadBookings]);

  // Group bookings according to PRD & requirements
  const { upcomingBookings, pastBookings, cancelledBookings } = useMemo(() => {
    const upcoming = [];
    const past = [];
    const cancelled = [];
    const now = new Date();

    bookings.forEach((b) => {
      const eventStart = b.event_details?.start_time ? new Date(b.event_details.start_time) : null;
      const eventEnd = b.event_details?.end_time ? new Date(b.event_details.end_time) : null;
      
      // An event belongs in Past Events if:
      // 1. Booking status is 'COMPLETED' or 'ATTENDED'
      // 2. OR the event start time has already passed (eventStart < now)
      // 3. OR the event end time has passed (eventEnd < now)
      const isPast = b.status === 'COMPLETED' || 
                     b.status === 'ATTENDED' || 
                     (eventStart && eventStart < now) || 
                     (eventEnd && eventEnd < now);

      if (b.status === 'CANCELLED') {
        cancelled.push(b);
      } else if (isPast) {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });

    return {
      upcomingBookings: upcoming,
      pastBookings: past,
      cancelledBookings: cancelled
    };
  }, [bookings]);

  // Active tab items
  const currentTabItems = useMemo(() => {
    if (activeTab === 'upcoming') return upcomingBookings;
    if (activeTab === 'past') return pastBookings;
    if (activeTab === 'cancelled') return cancelledBookings;
    return [];
  }, [activeTab, upcomingBookings, pastBookings, cancelledBookings]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Pagination calculations
  const totalPages = Math.ceil(currentTabItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentTabItems.slice(start, start + itemsPerPage);
  }, [currentTabItems, currentPage, itemsPerPage]);

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      setCancelling(true);
      await api.cancelBooking(bookingToCancel.booking_id);
      showToast && showToast(`Booking ${bookingToCancel.booking_id} has been cancelled.`);
      setBookingToCancel(null);
      await loadBookings();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      showToast && showToast('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // ── NAVIGATE TO PAYMENT METHOD SELECTION ──
  const handleMakePayment = (booking) => {
    try {
      sessionStorage.setItem('eventrix_payment_pending_booking', JSON.stringify(booking));
    } catch (e) {}

    if (onNavigate) {
      onNavigate('payment-method', booking);
    } else {
      window.location.hash = '#payment-method';
    }
  };

  const getTierLabel = (tier) => {
    if (tier === 'VIP') return t('modal.vipAccess', 'VIP Pass');
    if (tier === 'EARLY_BIRD') return t('modal.earlyBird', 'Early Bird');
    return t('modal.generalAdmission', 'General Admission');
  };

  // Open Rate & Review Modal
  const handleOpenReviewModal = (booking, existingReview = null) => {
    setReviewModalBooking(booking);
    if (existingReview) {
      setReviewRating(existingReview.rating || 5);
      setReviewComment(existingReview.comment || '');
      setReviewAuthorName(existingReview.author || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
      const defaultName = currentUser?.first_name 
        ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
        : (currentUser?.username || booking?.attendee_name || '');
      setReviewAuthorName(defaultName);
    }
  };

  // Submit / Update Review
  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewModalBooking || !reviewComment.trim()) return;

    setSubmittingReview(true);
    const event = reviewModalBooking.event_details || {};
    const eventIdVal = event.id || event.slug || reviewModalBooking.event_id || 'event';
    const authorVal = reviewAuthorName.trim() || (currentUser?.username || 'Verified Attendee');

    const existingIndex = reviews.findIndex(r => r.booking_id === reviewModalBooking.booking_id);
    
    let updatedReviews;
    let newReviewObj;

    if (existingIndex >= 0) {
      newReviewObj = {
        ...reviews[existingIndex],
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
        author: authorVal,
        updatedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      updatedReviews = [...reviews];
      updatedReviews[existingIndex] = newReviewObj;
    } else {
      newReviewObj = {
        id: `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        booking_id: reviewModalBooking.booking_id,
        eventId: eventIdVal,
        event_title: event.title || 'Event',
        author: authorVal,
        author_email: currentUser?.email || '',
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
        status: 'PUBLISHED',
        helpful: 0,
        isVerified: true,
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      updatedReviews = [newReviewObj, ...reviews];
    }

    try {
      localStorage.setItem('eventrix_event_reviews', JSON.stringify(updatedReviews));
      setReviews(updatedReviews);
      window.dispatchEvent(new CustomEvent('eventrix:new_review', { detail: newReviewObj }));
      window.dispatchEvent(new CustomEvent('eventrix:reviews_updated', { detail: updatedReviews }));
      showToast && showToast(`⭐ Thank you! Your review for "${event.title || 'Event'}" has been published.`);
    } catch (err) {
      console.warn('Review save error:', err);
    } finally {
      setSubmittingReview(false);
      setReviewModalBooking(null);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 animate-in fade-in duration-200">
      
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('booking.myBookings', 'My Bookings')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('booking.activePasses', 'Upcoming Events')} & {t('booking.pastEvents', 'Past Events')}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap">
            <button
              onClick={loadBookings}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Refresh Bookings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('common.loading', 'Refresh')}
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('explore')}
              className="gap-1.5 text-xs font-bold shadow-md shadow-[#075985]/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              {t('booking.browseEvents', 'Book Another Event')}
            </Button>
          </div>
        )}
      </div>

      {/* ── AUTH PROMPT (IF LOGGED OUT) ── */}
      {!currentUser && (
        <div className="card p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('auth.signIn', 'Sign In to View Your Bookings')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {t('booking.qrSecurityNotice', 'Access your verified digital boarding passes and review your booking receipts.')}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto font-semibold px-6"
            >
              {t('nav.signIn', 'Sign In')}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('explore')}
              className="w-full sm:w-auto"
            >
              {t('booking.browseEvents', 'Browse Events')}
            </Button>
          </div>
        </div>
      )}

      {/* ── AUTHENTICATED CONTENT ── */}
      {currentUser && (
        <>
          {/* ── BOOKING TABS ── */}
          <div className="d-flex align-items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-1 [scrollbar-width:none]">
            
            {/* Upcoming Events Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`d-flex align-items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'border-[#075985] text-[#075985] dark:text-[#38BDF8] dark:border-[#38BDF8]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{t('booking.activePasses', 'Upcoming Events')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'upcoming'
                  ? 'bg-[#E0F2FE] text-[#075985]'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {upcomingBookings.length}
              </span>
            </button>

            {/* Past Events Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`d-flex align-items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'past'
                  ? 'border-[#075985] text-[#075985] dark:text-[#38BDF8] dark:border-[#38BDF8]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t('booking.pastEvents', 'Past Events')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'past'
                  ? 'bg-[#E0F2FE] text-[#075985]'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {pastBookings.length}
              </span>
            </button>

            {/* Cancelled Events Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`d-flex align-items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'border-[#075985] text-[#075985] dark:text-[#38BDF8] dark:border-[#38BDF8]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{t('booking.cancelled', 'Cancelled Events')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'cancelled'
                  ? 'bg-[#E0F2FE] text-[#075985]'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {cancelledBookings.length}
              </span>
            </button>
          </div>

          {/* ── LOADING STATE ── */}
          {loading && (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-[#075985]/20 border-t-[#075985] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500">{t('common.loading', 'Loading your Eventrix bookings...')}</p>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {!loading && error && (
            <div className="card p-6 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-center rounded-2xl mb-6">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>
              <Button variant="outline" size="sm" onClick={loadBookings} className="mt-3 mx-auto">
                {t('common.loading', 'Retry')}
              </Button>
            </div>
          )}

          {/* ── EMPTY STATES ── */}
          {!loading && !error && currentTabItems.length === 0 && (
            <div className="card p-10 sm:p-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm my-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-4">
                {activeTab === 'upcoming' && <Calendar className="w-8 h-8" />}
                {activeTab === 'past' && <CheckCircle2 className="w-8 h-8" />}
                {activeTab === 'cancelled' && <XCircle className="w-8 h-8" />}
              </div>

              {activeTab === 'upcoming' && (
                <>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('booking.noBookingsTitle', 'No upcoming events')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {t('booking.noBookingsDesc', "You don't have any upcoming Eventrix bookings yet.")}
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onNavigate('explore')}
                    className="mt-6 mx-auto px-6 font-semibold"
                  >
                    {t('booking.browseEvents', 'Explore Events')}
                  </Button>
                </>
              )}

              {activeTab === 'past' && (
                <>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('booking.pastEvents', 'No past events')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {t('booking.noBookingsDesc', 'Your completed Eventrix bookings will appear here.')}
                  </p>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => onNavigate('explore')}
                    className="mt-6 mx-auto px-6"
                  >
                    {t('booking.browseEvents', 'Explore Events')}
                  </Button>
                </>
              )}

              {activeTab === 'cancelled' && (
                <>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('booking.cancelled', 'No cancelled bookings')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {t('booking.noBookingsDesc', "You don't have any cancelled Eventrix bookings.")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── BOOKINGS LIST (2 CARDS PER ROW) ── */}
          {!loading && !error && paginatedItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              {paginatedItems.map((booking) => {
                const rawEvent = booking.event_details || {};
                const event = translateEvent ? translateEvent(rawEvent) : rawEvent;
                const reqs = booking.custom_requirements || {};
                const tier = reqs.ticket_tier;
                const isUpcoming = activeTab === 'upcoming';
                const isPast = activeTab === 'past';
                const isCancelled = activeTab === 'cancelled';
                const hasLoyaltyDiscount = parseFloat(booking.discount_amount) > 0;

                return (
                  <div 
                    key={booking.id || booking.booking_id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Event Banner Image with Overlays */}
                      <div 
                        className="relative h-44 sm:h-48 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3.5 group cursor-pointer" 
                        onClick={() => onOpenDetails(event)}
                      >
                        <img
                          src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                          alt={event.title || 'Event banner'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md">
                            {event.category_details?.name || 'Live Event'}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          {booking.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm">
                              <XCircle className="w-3 h-3" />
                              {t('booking.cancelled', 'Cancelled')}
                            </span>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('booking.paidVerified', 'Confirmed')}
                            </span>
                          )}
                          {booking.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm">
                              {t('payment.payNow', 'Pending Payment')}
                            </span>
                          )}
                          {booking.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800/90 text-slate-200 backdrop-blur-md shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('booking.pastEvents', 'Completed')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header row: Booking ID and Booked Date */}
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400">{t('booking.bookingId', 'Booking ID')}:</span>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                            {booking.booking_id}
                          </span>
                        </div>
                        <span className="text-[11px]">{t('booking.issuedOn', 'Booked')} {formatDate(booking.booked_at)}</span>
                      </div>

                      {/* Event Title */}
                      <h3 
                        onClick={() => onOpenDetails(event)}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-[#075985] transition-colors line-clamp-1 cursor-pointer mb-2.5"
                        title={event.title}
                      >
                        {event.title}
                      </h3>

                      {/* Schedule & Venue Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                          <span className="font-semibold">{formatDate(event.start_time)}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{formatTime(event.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.venue_name || 'Venue'} • {event.location_or_link || event.city}</span>
                        </div>
                      </div>

                      {/* Ticket Tier & Preferences Pill */}
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2 mb-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{getTierLabel(tier)}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {booking.quantity} {booking.quantity === 1 ? t('booking.ticket', 'Ticket') : t('booking.tickets', 'Tickets')}
                          </span>
                        </div>
                        {reqs.seating_preference && reqs.seating_preference !== 'Standard' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {reqs.seating_preference}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: Price & Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      {/* Price Section */}
                      <div>
                        {hasLoyaltyDiscount ? (
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[11px] text-slate-400 line-through font-mono">
                                {formatCurrency(booking.unit_price * booking.quantity)}
                              </span>
                              <span className="text-base font-extrabold text-[#075985] font-mono">
                                {formatCurrency(booking.total_price)}
                              </span>
                            </div>
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {booking.status === 'PENDING'
                                ? `Amount Due (${booking.discount_percentage}% Loyalty Applied)`
                                : `${booking.discount_percentage}% Loyalty Applied`}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                              {parseFloat(booking.total_price) === 0 ? t('card.free', 'FREE') : formatCurrency(booking.total_price)}
                            </div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                              {booking.status === 'PENDING'
                                ? t('modal.totalAmount', 'Amount Due')
                                : (parseFloat(booking.total_price) === 0 ? 'RSVP' : t('booking.settledAmount', 'Total Paid'))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* If Past Event, Show Rate & Review Button */}
                        {isPast && (
                          <>
                            {reviews.find(r => r.booking_id === booking.booking_id) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReviewModal(booking, reviews.find(r => r.booking_id === booking.booking_id))}
                                className="gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                title="Click to edit review"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>{reviews.find(r => r.booking_id === booking.booking_id).rating}★ {t('booking.reviewedBadge', 'Reviewed')}</span>
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenReviewModal(booking)}
                                className="gap-1.5 text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm border-0"
                              >
                                <Star className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                                <span>{t('booking.rateEvent', 'Rate & Review')}</span>
                              </Button>
                            )}
                          </>
                        )}

                        {/* Pending payment action */}
                        {booking.status === 'PENDING' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMakePayment(booking)}
                            className="gap-1.5 text-xs font-bold px-3 py-1.5 shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{t('payment.payNow', 'Make Payment')}</span>
                          </Button>
                        )}

                        {/* Confirmed booking action: View Ticket */}
                        {(booking.status === 'CONFIRMED' || isPast) && (
                          <Button
                            variant={isPast ? "outline" : "primary"}
                            size="sm"
                            onClick={() => setSelectedTicketBooking(booking)}
                            className={`gap-1.5 text-xs font-bold px-3 py-1.5 shadow-sm ${isPast ? 'text-slate-700 dark:text-slate-300' : ''}`}
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>{t('booking.viewPass', 'View Ticket')}</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenDetails(event)}
                          className="gap-1 text-xs px-3 py-1.5 text-slate-700 dark:text-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t('card.viewDetails', 'Details')}
                        </Button>

                        {isUpcoming && booking.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => setBookingToCancel(booking)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION (BOOTSTRAP 5) ── */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav aria-label="Bookings pagination">
                <ul className="pagination flex items-center gap-1 list-none p-0 m-0">
                  
                  {/* Previous */}
                  <li className={`page-item ${currentPage === 1 ? 'disabled opacity-40 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      « {t('common.back', 'Previous')}
                    </button>
                  </li>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <li key={num} className="page-item">
                      <button
                        onClick={() => setCurrentPage(num)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          currentPage === num
                            ? 'bg-[#075985] text-white shadow-md shadow-[#075985]/25'
                            : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    </li>
                  ))}

                  {/* Next */}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled opacity-40 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {t('common.success', 'Next')} »
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}

      {/* ── DIGITAL TICKET PASS MODAL ── */}
      <TicketPassModal
        isOpen={!!selectedTicketBooking}
        onClose={() => setSelectedTicketBooking(null)}
        booking={selectedTicketBooking}
        currentUser={currentUser}
      />

      {/* ── CANCEL BOOKING CONFIRMATION DIALOG ── */}
      {bookingToCancel && (
        <Dialog open={Boolean(bookingToCancel)} onOpenChange={(open) => !open && setBookingToCancel(null)}>
          <DialogContent 
            isOpen={Boolean(bookingToCancel)}
            onClose={() => setBookingToCancel(null)}
            className="max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 font-sans"
          >
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {t('booking.cancelBooking', 'Cancel Booking')}?
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Are you sure you want to cancel booking <strong className="font-mono text-slate-800 dark:text-slate-200">{bookingToCancel?.booking_id}</strong> for <strong className="text-slate-800 dark:text-slate-200">{bookingToCancel?.event_details?.title}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {t('booking.qrSecurityNotice', 'Your ticket will be released and moved to the Cancelled Events tab.')}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setBookingToCancel(null)}
                disabled={cancelling}
              >
                {t('profile.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmCancel}
                loading={cancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              >
                {t('booking.cancelBooking', 'Yes, Cancel Ticket')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── RATE & REVIEW EVENT MODAL ── */}
      {reviewModalBooking && (
        <Dialog open={Boolean(reviewModalBooking)} onOpenChange={(open) => !open && setReviewModalBooking(null)}>
          <DialogContent 
            isOpen={Boolean(reviewModalBooking)}
            onClose={() => setReviewModalBooking(null)}
            className="max-w-lg p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 font-sans shadow-2xl"
          >
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                    {t('booking.rateEvent', 'Rate & Review Event')}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Share your verified attendee feedback for the event platform
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Event Preview Banner */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3 my-2">
              <img
                src={reviewModalBooking.event_details?.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&auto=format&fit=crop&q=80'}
                alt="Event"
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {reviewModalBooking.event_details?.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {reviewModalBooking.event_details?.venue_name} • {reviewModalBooking.booking_id}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Ticket Pass Holder</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 mt-3">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHoverRating(star)}
                      onMouseLeave={() => setReviewHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          (reviewHoverRating || reviewRating) >= star
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 ml-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900">
                    {reviewRating === 5 && '⭐️⭐️⭐️⭐️⭐️ Exceptional'}
                    {reviewRating === 4 && '⭐️⭐️⭐️⭐️ Very Good'}
                    {reviewRating === 3 && '⭐️⭐️⭐️ Average'}
                    {reviewRating === 2 && '⭐️⭐️ Needs Improvement'}
                    {reviewRating === 1 && '⭐️ Poor Experience'}
                  </span>
                </div>
              </div>

              {/* Attendee Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={reviewAuthorName}
                  onChange={(e) => setReviewAuthorName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#075985]"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Feedback & Experience
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the event organization, acoustics, stage visibility, QR pass scanning, and crowd management?"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#075985]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setReviewModalBooking(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingReview}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold gap-1.5 border-0 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Review</span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
