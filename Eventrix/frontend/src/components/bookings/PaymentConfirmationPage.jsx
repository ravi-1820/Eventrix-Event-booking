import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckCircle2, Download, Printer, Copy, Check, 
  ArrowRight, ShieldCheck, Ticket, Image, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../ui/button';
import { VerifiedEventTicket } from '../tickets/VerifiedEventTicket';
import { downloadTicketPDF, downloadTicketImage } from '../../lib/ticketExporter';
import { useLanguage } from '../../context/LanguageContext';

export function PaymentConfirmationPage({ bookingData, onNavigate }) {
  const { t } = useLanguage();
  const [booking, setBooking] = useState(() => {
    if (bookingData?.booking) return bookingData.booking;
    if (bookingData) return bookingData;
    try {
      const cached = sessionStorage.getItem('eventrix_confirmed_booking');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const ticketRef = useRef(null);

  // Sync prop updates
  useEffect(() => {
    if (bookingData) {
      const actualBooking = bookingData.booking || bookingData;
      setBooking(actualBooking);
      try {
        sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(actualBooking));
      } catch (e) {}
    }
  }, [bookingData]);

  // Trigger celebration confetti
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#075985', '#0284C7', '#FF4F70', '#38BDF8', '#BAE6FD'],
      });
    } catch (e) {}
  }, []);

  const handleCopyId = () => {
    if (!booking?.booking_id) return;
    navigator.clipboard?.writeText(booking.booking_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current || downloadingPdf) return;
    try {
      setDownloadingPdf(true);
      await downloadTicketPDF(ticketRef.current, booking?.booking_id || 'ticket');
    } catch (e) {
      console.error('PDF download error:', e);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!ticketRef.current || downloadingImage) return;
    try {
      setDownloadingImage(true);
      await downloadTicketImage(ticketRef.current, booking?.booking_id || 'ticket');
    } catch (e) {
      console.error('Image download error:', e);
    } finally {
      setDownloadingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const bookingId = booking?.booking_id || 'ETX-CONFIRMED';
  const payment = booking?.payment_details || booking?.payment || {};
  const isCash = payment.provider === 'cash' || booking?.payment_method === 'CASH' || String(booking?.payment_id || '').startsWith('CASH') || String(payment.payment_id || '').startsWith('CASH');
  const paymentId = isCash 
    ? (payment.payment_id || booking?.payment_id || `CASH-${bookingId}`)
    : (payment.payment_id || booking?.razorpay_payment_id || booking?.payment_id || 'pay_verified');
  const amountPaid = booking?.total_price ?? booking?.amount_paid ?? 0;

  return (
    <div className="min-h-[85vh] bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">

        {/* ── SUCCESS BANNER (Hidden on Print) ── */}
        <div className="no-print text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-500/10 mb-1">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              {isCash ? '✓ Cash Payment Confirmed & Pass Issued' : '✓ Payment Verified & Booking Confirmed'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('payment.confirmedTitle', 'Booking & Payment Successful!')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
            {isCash 
              ? 'Your cash payment reservation has been confirmed. Your official Eventrix Entry Pass is ready below — show this at the entrance.'
              : t('payment.confirmedSubtitle', 'Your payment has been received and verified. Your official Eventrix Entry Pass is ready below.')}
          </p>
        </div>

        {/* ── TRANSACTION QUICK SUMMARY BAR (Hidden on Print) ── */}
        <div className="no-print bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('booking.bookingId', 'Booking ID')}</span>
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">{bookingId}</span>
              <button 
                onClick={handleCopyId}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title="Copy Booking ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Method / ID</span>
            <span className="font-mono text-xs font-semibold text-slate-700 truncate block max-w-[130px]" title={paymentId}>
              {isCash ? '💵 Cash at Venue' : paymentId}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('booking.settledAmount', 'Amount')}</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-600 font-mono">
              ₹{Number(amountPaid).toFixed(2)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pass Status</span>
            <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
              CONFIRMED
            </span>
          </div>
        </div>


        {/* ── ACTION BAR (DOWNLOAD & PRINT) (Hidden on Print) ── */}
        <div className="no-print flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="md"
              disabled={downloadingPdf}
              onClick={handleDownloadPdf}
              className="gap-2 bg-[#075985] hover:bg-[#0369A1] text-white font-bold shadow-md shadow-[#075985]/20 cursor-pointer px-5"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('common.loading', 'Preparing PDF...')}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t('booking.downloadPdf', 'Download Pass (PDF)')}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="md"
              disabled={downloadingImage}
              onClick={handleDownloadImage}
              className="gap-1.5 text-slate-700 font-semibold px-3.5 cursor-pointer hover:bg-slate-100"
            >
              {downloadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Image className="w-4 h-4 text-[#075985]" />
              )}
              <span>Save Image</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handlePrint}
              className="gap-1.5 text-slate-700 font-semibold px-4 cursor-pointer hover:bg-slate-100"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ticket</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate && onNavigate('my-bookings')}
              className="gap-1.5 text-slate-700 font-semibold px-4 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#075985]" />
              <span>{t('booking.myBookings', 'My Bookings')}</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate && onNavigate('explore')}
              className="gap-1.5 text-slate-700 font-semibold px-4 cursor-pointer"
            >
              <span>{t('booking.browseEvents', 'Explore More')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── UNIFIED REUSABLE PASS COMPONENT (PRINTABLE / PDF TARGET) ── */}
        <div className="eventrix-print-area">
          <VerifiedEventTicket
            ref={ticketRef}
            booking={booking}
          />
        </div>

      </div>
    </div>
  );
}
