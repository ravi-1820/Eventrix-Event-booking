import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Ticket, CheckCircle2, Clock, XCircle, 
  RotateCcw, DollarSign, Filter, Eye, Copy, Check
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { BookingDetailDrawer } from '../BookingDetailDrawer';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminBookingsView({
  bookings = [],
  events = [],
  onBookingStatusChange,
  showToast
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Top summary KPIs
  const summary = useMemo(() => {
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let totalRev = 0;

    bookings.forEach((b) => {
      if (b.status === 'CONFIRMED') {
        confirmedCount++;
        totalRev += b.total_price || 0;
      } else if (b.status === 'PENDING') {
        pendingCount++;
      } else if (b.status === 'CANCELLED') {
        cancelledCount++;
      }
    });

    return {
      total: bookings.length,
      confirmed: confirmedCount,
      pending: pendingCount,
      cancelled: cancelledCount,
      revenue: totalRev,
    };
  }, [bookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (b.booking_id && b.booking_id.toLowerCase().includes(q)) ||
        (b.attendee_name && b.attendee_name.toLowerCase().includes(q)) ||
        (b.attendee_email && b.attendee_email.toLowerCase().includes(q)) ||
        (b.event_title && b.event_title.toLowerCase().includes(q))
      );

      const matchEvent = eventFilter === 'ALL' || String(b.event_id) === eventFilter || b.event_title === eventFilter;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const isFree = b.total_price === 0;
      const matchPayment = paymentFilter === 'ALL' || (paymentFilter === 'FREE' ? isFree : !isFree);

      return matchSearch && matchEvent && matchStatus && matchPayment;
    });
  }, [bookings, search, eventFilter, statusFilter, paymentFilter]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
    if (showToast) showToast(`Copied ${text}`);
  };

  const handleRowClick = (booking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5 font-sans animate-in fade-in duration-200">
      
      {/* 1. TOP SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('admin.totalBookings', 'Total Bookings')}</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">{summary.total}</p>
          <span className="text-[10px] text-slate-400 font-medium">{t('admin.ticketsIssued', 'All reservations')}</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">{t('admin.statusConfirmed', 'Confirmed')}</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700">{summary.confirmed}</p>
          <span className="text-[10px] text-emerald-600 font-bold">{t('admin.activeLive', 'Active passes')}</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">{t('admin.statusPending', 'Pending')}</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-700">{summary.pending}</p>
          <span className="text-[10px] text-amber-600 font-bold">Awaiting check</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">{t('admin.statusCancelled', 'Cancelled')}</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-700">{summary.cancelled}</p>
          <span className="text-[10px] text-rose-600 font-bold">Voided / Refunded</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">{t('admin.totalRevenue', 'Gross Revenue')}</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-indigo-700">{formatCurrency(summary.revenue)}</p>
          <span className="text-[10px] text-indigo-600 font-bold">Settled volume</span>
        </div>

      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchBookings', 'Search by Booking code, attendee name, email, or event title...')}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="ALL">{t('admin.allEvents', 'All Events')}</option>
            {events.map((ev) => (
              <option key={ev.id || ev.slug} value={String(ev.id)}>{ev.title}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{t('admin.allStatus', 'All Status')}</option>
            <option value="CONFIRMED">{t('admin.statusConfirmed', 'Confirmed')}</option>
            <option value="PENDING">{t('admin.statusPending', 'Pending')}</option>
            <option value="CANCELLED">{t('admin.statusCancelled', 'Cancelled')}</option>
          </select>

          {/* Payment Type */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{t('admin.allPrices', 'All Payments')}</option>
            <option value="PAID">{t('admin.paidOnly', 'Paid (Razorpay)')}</option>
            <option value="FREE">{t('admin.freeOnly', 'Free RSVP')}</option>
          </select>
        </div>

      </div>

      {/* 3. BOOKINGS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">{t('admin.colBookingId', 'Booking Code')}</th>
                <th className="py-3.5 px-4">{t('admin.colAttendee', 'Customer')}</th>
                <th className="py-3.5 px-4">{t('admin.colEvent', 'Event')}</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">{t('admin.colAmount', 'Total Amount')}</th>
                <th className="py-3.5 px-4">{t('admin.colPayment', 'Payment')}</th>
                <th className="py-3.5 px-4">{t('admin.colStatus', 'Status')}</th>
                <th className="py-3.5 px-4">{t('admin.colDate', 'Created At')}</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">{t('admin.colAction', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">{t('admin.noBookingsFound', 'No bookings found')}</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isCopied = copiedId === b.booking_id;
                  const isFree = b.total_price === 0;
                  return (
                    <tr 
                      key={b.id || b.booking_id} 
                      onClick={() => handleRowClick(b)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      {/* Booking Code */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleCopy(b.booking_id); }}
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors group cursor-copy"
                          title="Click to copy booking code"
                        >
                          <span>{b.booking_id}</span>
                          {isCopied ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{b.attendee_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{b.attendee_email}</p>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={b.event_title}>
                        {b.event_title}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {b.quantity} Pass{b.quantity !== 1 ? 'es' : ''}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                        {isFree ? t('admin.free', 'FREE') : formatCurrency(b.total_price)}
                      </td>

                      {/* Payment Provider */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {isFree ? t('admin.freeRsvp', 'Free RSVP') : 'Razorpay'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {formatDate(b.booked_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRowClick(b)}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>{t('admin.details', 'View')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={onBookingStatusChange}
        showToast={showToast}
      />

    </div>
  );
}
