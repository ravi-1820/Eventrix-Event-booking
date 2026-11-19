import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Users, Download, CheckCircle2, XCircle, 
  Mail, Phone, Ticket, Calendar, ShieldCheck, Filter
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminAttendeesView({ bookings = [], events = [], showToast }) {
  const { t, translateEvent } = useLanguage();
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [checkInFilter, setCheckInFilter] = useState('ALL'); // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN'
  const [checkInMap, setCheckInMap] = useState(() => {
    try {
      const cached = localStorage.getItem('eventrix_admin_checkins');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // Extract attendee rows from bookings
  const attendees = useMemo(() => {
    return bookings.map((b) => {
      const isCheckedIn = Boolean(checkInMap[b.booking_id]);
      return {
        id: b.id || b.booking_id,
        booking_id: b.booking_id,
        name: b.attendee_name || 'Attendee',
        email: b.attendee_email || '—',
        phone: b.attendee_phone || '—',
        event_title: b.event_title,
        event_id: b.event_id,
        quantity: b.quantity || 1,
        ticket_type: b.total_price === 0 ? 'Free RSVP' : 'Standard Pass',
        payment_status: b.total_price === 0 ? 'Complimentary' : 'Paid',
        booked_at: b.booked_at,
        is_checked_in: isCheckedIn,
      };
    });
  }, [bookings, checkInMap]);

  // Filtered attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.booking_id.toLowerCase().includes(q) ||
        (a.event_title && a.event_title.toLowerCase().includes(q))
      );

      const matchEvent = eventFilter === 'ALL' || String(a.event_id) === eventFilter || a.event_title === eventFilter;
      const matchCheckIn = checkInFilter === 'ALL' || (
        checkInFilter === 'CHECKED_IN' ? a.is_checked_in : !a.is_checked_in
      );

      return matchSearch && matchEvent && matchCheckIn;
    });
  }, [attendees, search, eventFilter, checkInFilter]);

  const toggleCheckIn = (bookingId) => {
    setCheckInMap((prev) => {
      const next = { ...prev, [bookingId]: !prev[bookingId] };
      try {
        localStorage.setItem('eventrix_admin_checkins', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    const state = !checkInMap[bookingId];
    if (showToast) showToast(state ? t('admin.attendees.checkedInSuccess', 'Attendee checked in!') : t('admin.attendees.checkedOutSuccess', 'Check-in revoked.'));
  };

  const exportCSV = () => {
    if (filteredAttendees.length === 0) {
      if (showToast) showToast(t('admin.attendees.noAttendeesExport', 'No attendees to export.'));
      return;
    }

    const headers = ['Booking ID', 'Attendee Name', 'Email', 'Event', 'Ticket Type', 'Quantity', 'Payment Status', 'Check-In Status', 'Booked At'];
    const rows = filteredAttendees.map(a => [
      `"${a.booking_id}"`,
      `"${a.name}"`,
      `"${a.email}"`,
      `"${a.event_title}"`,
      `"${a.ticket_type}"`,
      a.quantity,
      `"${a.payment_status}"`,
      a.is_checked_in ? 'Checked In' : 'Pending Check-In',
      `"${formatDate(a.booked_at)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eventrix_attendees_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(t('admin.attendees.exportedCSV', `Exported ${filteredAttendees.length} attendees to CSV.`));
  };

  const checkedInTotal = attendees.filter(a => a.is_checked_in).length;

  return (
    <div className="space-y-5 font-sans animate-in fade-in duration-200">
      
      {/* Top Summary Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              {t('admin.attendees.directory', 'Attendee Directory')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
              {attendees.length} {t('admin.attendees.totalRegistered', 'Total Registered')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('admin.attendees.subtitle', 'Monitor gate attendance, verify tickets, and manage guest entry')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('admin.attendees.checkedIn', 'Checked In')}</span>
            <span className="font-mono font-bold text-sm text-emerald-600">
              {checkedInTotal} / {attendees.length} ({attendees.length > 0 ? Math.round((checkedInTotal / attendees.length) * 100) : 0}%)
            </span>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>{t('admin.attendees.exportCSV', 'Export CSV')}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.attendees.searchPlaceholder', 'Search by attendee name, email, booking code, or event...')}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            <option value="ALL">{t('admin.common.allEvents', 'All Events')}</option>
            {events.map((ev) => (
              <option key={ev.id || ev.slug} value={String(ev.id)}>{translateEvent(ev).title || ev.title}</option>
            ))}
          </select>

          {/* Check-In Status Filter */}
          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{t('admin.attendees.allCheckIns', 'All Check-Ins')}</option>
            <option value="CHECKED_IN">{t('admin.attendees.checkedIn', 'Checked In')}</option>
            <option value="NOT_CHECKED_IN">{t('admin.attendees.pendingEntry', 'Pending Entry')}</option>
          </select>
        </div>

      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">{t('admin.attendees.thAttendee', 'Attendee')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thContact', 'Contact')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thEvent', 'Event')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thPassType', 'Pass Type')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thBookingId', 'Booking ID')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thPayment', 'Payment')}</th>
                <th className="py-3.5 px-4">{t('admin.attendees.thCheckInStatus', 'Check-In Status')}</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">{t('admin.attendees.thAction', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">{t('admin.attendees.noAttendees', 'No attendees matching criteria')}</p>
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((a) => (
                  <tr key={a.booking_id} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* Attendee Info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {a.name ? a.name[0].toUpperCase() : 'A'}
                        </div>
                        <p className="font-bold text-slate-900 truncate">{a.name}</p>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-600 truncate flex items-center gap-1 font-medium">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        {a.email}
                      </p>
                    </td>

                    {/* Event */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={a.event_title}>
                      {translateEvent({ title: a.event_title }).title || a.event_title}
                    </td>

                    {/* Pass Type */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {a.quantity} × {a.ticket_type === 'Free RSVP' ? t('admin.attendees.freeRSVP', 'Free RSVP') : t('admin.attendees.standardPass', 'Standard Pass')}
                    </td>

                    {/* Booking ID */}
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {a.booking_id}
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {a.payment_status === 'Paid' ? t('admin.common.paid', 'Paid') : t('admin.common.complimentary', 'Complimentary')}
                      </span>
                    </td>

                    {/* Check-In Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        a.is_checked_in
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${a.is_checked_in ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {a.is_checked_in ? t('admin.attendees.checkedIn', 'Checked In') : t('admin.attendees.pendingEntry', 'Pending Entry')}
                      </span>
                    </td>

                    {/* Check-In Toggle Action */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={() => toggleCheckIn(a.booking_id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                          a.is_checked_in
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        {a.is_checked_in ? (
                          <>
                            <XCircle size={13} className="text-slate-500" />
                            <span>{t('admin.attendees.checkOut', 'Check Out')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} className="text-white" />
                            <span>{t('admin.attendees.checkIn', 'Check In')}</span>
                          </>
                        )}
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
