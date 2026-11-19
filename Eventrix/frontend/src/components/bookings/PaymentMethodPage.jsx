import React, { useState, useEffect } from 'react';
import { ArrowLeft, Banknote, CreditCard, Loader2, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils';
import { api } from '../../api/client';
import { loadRazorpayScript } from '../../lib/razorpay';
import { EVENTRIX_LOGO_DATA_URI } from '../../lib/logoBase64';
import { useLanguage } from '../../context/LanguageContext';

export function PaymentMethodPage({ bookingData, currentUser, onNavigate, showToast }) {
  const { t, translateEvent } = useLanguage();
  const [booking, setBooking] = useState(() => {
    if (bookingData?.booking) return bookingData.booking;
    if (bookingData) return bookingData;
    try {
      const cached = sessionStorage.getItem('eventrix_payment_pending_booking');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [selectedMethod, setSelectedMethod] = useState('cash'); // 'cash' | 'online'
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (bookingData) {
      const actualBooking = bookingData.booking || bookingData;
      setBooking(actualBooking);
      try {
        sessionStorage.setItem('eventrix_payment_pending_booking', JSON.stringify(actualBooking));
      } catch (e) {}
    }
  }, [bookingData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const rawEvent = booking?.event_details || booking?.event || {};
  const event = translateEvent ? translateEvent(rawEvent) : rawEvent;
  const totalDue = parseFloat(booking?.total_price || 0);
  const quantity = booking?.quantity || 1;
  const bookingId = booking?.booking_id || '';

  const getTierLabel = () => {
    const tier = booking?.custom_requirements?.ticket_tier;
    if (tier === 'VIP') return t('modal.vipAccess', 'VIP Pass');
    if (tier === 'EARLY_BIRD') return t('modal.earlyBird', 'Early Bird');
    return t('modal.generalAdmission', 'General Admission');
  };

  // Cash payment handler
  const handleCashPayment = async () => {
    if (!booking) return;
    setErrorMessage('');
    setProcessing(true);

    try {
      const res = await api.confirmCashPayment(booking.booking_id);

      const confirmedData = {
        ...booking,
        status: 'CONFIRMED',
        amount_paid: res.amount_paid ?? totalDue,
        payment_method: 'CASH',
        payment_id: `CASH-${booking.booking_id}`,
        payment_details: {
          provider: 'cash',
          payment_id: `CASH-${booking.booking_id}`,
          status: 'SUCCEEDED',
          amount: totalDue,
          currency: 'INR',
        },
      };

      try {
        sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(confirmedData));
        sessionStorage.removeItem('eventrix_payment_pending_booking');
      } catch (e) {}

      if (showToast) {
        showToast('Cash payment confirmed! Your booking is complete.');
      }

      if (onNavigate) {
        onNavigate('payment-confirmation', confirmedData);
      } else {
        window.location.hash = '#payment-confirmation';
      }
    } catch (err) {
      console.error('Failed to confirm cash payment:', err);
      const msg = err.message || 'Unable to confirm cash payment. Please try again.';
      setErrorMessage(msg);
      if (showToast) showToast(msg);
    } finally {
      setProcessing(false);
    }
  };

  // Online Razorpay handler
  const handleOnlinePayment = async () => {
    if (!booking) return;
    setErrorMessage('');
    setProcessing(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Unable to load payment SDK. Please check your internet connection.');
      }

      const orderData = await api.createRazorpayOrder(booking.booking_id);

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Eventrix',
        description: `Booking ${booking.booking_id} - ${event.title || 'Event Admission'}`,
        image: EVENTRIX_LOGO_DATA_URI,
        order_id: orderData.order_id,
        prefill: {
          name: currentUser?.first_name 
            ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
            : (currentUser?.username || ''),
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
        theme: {
          color: '#075985',
        },
        handler: async function (response) {
          try {
            setProcessing(true);
            const verifyRes = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: booking.booking_id,
            });

            const confirmedData = {
              ...booking,
              status: 'CONFIRMED',
              amount_paid: verifyRes.amount_paid ?? totalDue,
              payment_id: response.razorpay_payment_id,
              payment_details: {
                provider: 'razorpay',
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                status: 'SUCCEEDED',
                amount: totalDue,
                currency: 'INR',
              },
            };

            try {
              sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(confirmedData));
              sessionStorage.removeItem('eventrix_payment_pending_booking');
            } catch (e) {}

            if (showToast) showToast('Payment verified successfully!');

            if (onNavigate) {
              onNavigate('payment-confirmation', confirmedData);
            } else {
              window.location.hash = '#payment-confirmation';
            }
          } catch (verifyErr) {
            setErrorMessage(verifyErr.message || 'Payment verification failed.');
            if (showToast) showToast(verifyErr.message || 'Payment verification failed.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            if (showToast) showToast('Payment cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setProcessing(false);
        const errMsg = resp.error?.description || 'Payment failed. Please try again.';
        setErrorMessage(errMsg);
        if (showToast) showToast(errMsg);
      });
      rzp.open();
    } catch (err) {
      console.error('Online payment error:', err);
      const msg = err.message || 'Could not initiate online payment.';
      setErrorMessage(msg);
      if (showToast) showToast(msg);
      setProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (selectedMethod === 'cash') {
      handleCashPayment();
    } else {
      handleOnlinePayment();
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('my-bookings');
    } else {
      window.location.hash = '#my-bookings';
    }
  };

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Booking Selected</h2>
        <p className="text-sm text-slate-500 mb-6">Please select a booking to proceed with payment.</p>
        <Button variant="primary" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Go to My Bookings
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[#E0F2FE]/30 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back navigation */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('booking.myBookings', 'Back to My Bookings')}</span>
        </button>

        {/* Clean Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('payment.selectMethod', 'Select Payment Method')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Choose how you would like to pay for your ticket.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">

          {/* Left: Payment Options (3 cols) */}
          <div className="md:col-span-3 space-y-3">

            {/* Cash Option */}
            <div
              onClick={() => setSelectedMethod('cash')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 bg-white ${
                selectedMethod === 'cash'
                  ? 'border-[#075985] ring-2 ring-[#075985]/15 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedMethod === 'cash' ? 'bg-[#E0F2FE] text-[#075985]' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('payment.cashCounter', 'Cash / Pay at Venue')}</h3>
                  <p className="text-xs text-slate-500">Pay at the event entrance counter</p>
                </div>
              </div>

              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                selectedMethod === 'cash' ? 'border-[#075985] bg-[#075985]' : 'border-slate-300 bg-white'
              }`}>
                {selectedMethod === 'cash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* Online Option */}
            <div
              onClick={() => setSelectedMethod('online')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 bg-white ${
                selectedMethod === 'online'
                  ? 'border-[#075985] ring-2 ring-[#075985]/15 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedMethod === 'online' ? 'bg-[#E0F2FE] text-[#075985]' : 'bg-slate-100 text-slate-500'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('payment.onlineUpiCard', 'Online Payment')}</h3>
                  <p className="text-xs text-slate-500">UPI, Cards, and NetBanking</p>
                </div>
              </div>

              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                selectedMethod === 'online' ? 'border-[#075985] bg-[#075985]' : 'border-slate-300 bg-white'
              }`}>
                {selectedMethod === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                disabled={processing}
                onClick={handleSubmit}
                className="w-full text-sm font-bold py-3.5 rounded-xl !bg-[#075985] hover:!bg-[#0369A1] !text-white shadow-md shadow-[#075985]/25 transition-all cursor-pointer"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.loading', 'Processing...')}</span>
                  </span>
                ) : selectedMethod === 'cash' ? (
                  `${t('payment.payNow', 'Confirm with Cash')} (${formatCurrency(totalDue)})`
                ) : (
                  `${t('payment.payNow', 'Pay Online')} (${formatCurrency(totalDue)})`
                )}
              </Button>
            </div>

          </div>

          {/* Right: Clean Order Summary (2 cols) */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Event
                </span>
                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                  {event.title || 'Event Admission'}
                </h4>
              </div>

              {event.start_time && (
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDate(event.start_time)} • {formatTime(event.start_time)}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{quantity} × {getTierLabel()}</span>
                {bookingId && <span className="font-mono text-slate-400">{bookingId}</span>}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Due</span>
                <span className="text-lg font-black text-[#075985] font-mono">
                  {formatCurrency(totalDue)}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
