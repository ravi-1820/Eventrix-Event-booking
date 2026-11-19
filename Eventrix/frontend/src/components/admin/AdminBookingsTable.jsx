import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Ticket, CheckCircle2, Clock, XCircle, 
  Copy, Check, AlertCircle, RefreshCw, Calendar
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate, formatCurrency } from '../../lib/utils';

export function AdminBookingsTable({ bookings = [], onBookingUpdated, showToast }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (b.booking_id && b.booking_id.toLowerCase().includes(q)) ||
        (b.attendee_name && b.attendee_name.toLowerCase().includes(q)) ||
        (b.attendee_email && b.attendee_email.toLowerCase().includes(q)) ||
        (b.event_title && b.event_title.toLowerCase().includes(q))
      );

      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1500);
    if (showToast) showToast(`Copied booking code ${code}`);
  };

  const handleStatusChange = async (booking, newStatus) => {
    if (booking.status === newStatus) return;
    setUpdatingId(booking.booking_id);
    try {
      await api.adminUpdateBookingStatus(booking.booking_id, newStatus);
      if (showToast) showToast(`Booking ${booking.booking_id} status updated to ${newStatus}`);
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update booking');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      
      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Booking code (ETX-...), attendee name, email, or event..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
          {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Bookings' : st[0] + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Booking Code</th>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Tickets</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Booking Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">No bookings found</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isUpdating = updatingId === b.booking_id;
                  const isCopied = copiedId === b.booking_id;
                  return (
                    <tr key={b.id || b.booking_id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Booking Code */}
                      <td className="py-4 px-4 sm:px-6">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(b.booking_id)}
                          className="font-mono font-bold text-slate-900 flex items-center gap-1.5 hover:text-[#075985] transition-colors group cursor-pointer"
                          title="Click to copy booking code"
                        >
                          <span>{b.booking_id}</span>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* Attendee */}
                      <td className="py-4 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {b.attendee_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {b.attendee_email}
                          </p>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={b.event_title}>
                          {b.event_title}
                        </p>
                      </td>

                      {/* Quantity */}
                      <td className="py-4 px-4">
                        <span className="font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {b.quantity} seat{b.quantity !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-mono font-extrabold text-slate-900">
                            {b.total_price === 0 ? 'FREE' : formatCurrency(b.total_price)}
                          </p>
                          {b.discount_amount > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              -{formatCurrency(b.discount_amount)} loyalty
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            b.status === 'CONFIRMED' ? 'bg-emerald-500' :
                            b.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {b.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4">
                        <span className="text-slate-500 text-[11px]">
                          {formatDate(b.booked_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status !== 'CANCELLED' ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(b, 'CANCELLED')}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Cancel booking"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(b, 'CONFIRMED')}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Re-activate booking"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Re-confirm</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
