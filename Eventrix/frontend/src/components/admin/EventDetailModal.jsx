import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, MapPin, Users, DollarSign, Pencil, Copy, 
  ExternalLink, Ticket, CheckCircle2, CreditCard, Sparkles, BarChart3
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onNavigateToPublic,
  bookings = []
}) {
  const { t, translateEvent, translateCity, translateVenue } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'bookings' | 'attendees'

  if (!isOpen || !event) return null;

  const translatedEvent = translateEvent(event);

  // Filter bookings for this event
  const eventBookings = bookings.filter(b => b.event_id === event.id || b.event_title === event.title);
  const totalRevenue = eventBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const totalTickets = eventBookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
  const isFree = parseFloat(event.ticket_price) === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] font-sans border border-slate-200/80"
        >
          {/* Header Banner */}
          <div className="relative h-48 sm:h-56 w-full bg-slate-900 overflow-hidden shrink-0">
            <img
              src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'}
              alt={translatedEvent.title || event.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header Content */}
            <div className="absolute bottom-4 left-6 right-6 text-white space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  event.status === 'PUBLISHED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {event.status === 'PUBLISHED' ? t('admin.common.published', 'PUBLISHED') : t('admin.common.draft', 'DRAFT')}
                </span>
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                  <MapPin size={12} />
                  {translateCity(event.city)} · {translateVenue(event.venue_name)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {translatedEvent.title || event.title}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <Calendar size={13} className="text-indigo-400" />
                <span>{formatDate(event.start_time)} – {formatDate(event.end_time)}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
            {/* Nav Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl">
              {[
                { id: 'overview', label: t('admin.events.modalOverview', 'Overview') },
                { id: 'bookings', label: `${t('admin.events.modalBookings', 'Bookings')} (${eventBookings.length})` },
                { id: 'attendees', label: t('admin.events.modalAttendees', 'Attendees') },
              ].map(tb => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setActiveTab(tb.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tb.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { onClose(); onEdit(event); }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Pencil size={13} />
                <span>{t('admin.events.edit', 'Edit')}</span>
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onDuplicate(event); }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Copy size={13} />
                <span>{t('admin.events.duplicate', 'Duplicate')}</span>
              </button>
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Top 4 Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">{t('admin.events.ticketsSold', 'Tickets Sold')}</span>
                <p className="text-lg font-black font-mono text-indigo-900 mt-0.5">
                  {event.booked_count || totalTickets} / {event.capacity}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">{t('admin.events.eventRevenue', 'Event Revenue')}</span>
                <p className="text-lg font-black font-mono text-emerald-900 mt-0.5">
                  {isFree ? t('admin.common.free', 'FREE') : formatCurrency(totalRevenue || ((event.booked_count || 0) * parseFloat(event.ticket_price || 0)))}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">{t('admin.events.admissionFee', 'Admission Fee')}</span>
                <p className="text-lg font-black font-mono text-amber-900 mt-0.5">
                  {isFree ? t('admin.common.free', 'FREE') : formatCurrency(event.ticket_price)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">{t('admin.events.capacityFill', 'Capacity Fill')}</span>
                <p className="text-lg font-black font-mono text-purple-900 mt-0.5">
                  {event.capacity > 0 ? Math.round(((event.booked_count || totalTickets) / event.capacity) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{t('admin.events.taglineAndSummary', 'Tagline & Summary')}</h3>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    {translatedEvent.short_description || event.short_description || t('admin.events.noSummary', 'No summary provided.')}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{t('admin.events.fullDescription', 'Full Description')}</h3>
                  <div className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                    {translatedEvent.description || event.description}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{t('admin.events.venueAndCoordinates', 'Venue & Coordinates')}</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <strong>{translateVenue(event.venue_name)}</strong> — {event.location_or_link || translateCity(event.city)}
                  </p>
                </div>
              </div>
            )}

            {/* TAB: BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-3">
                {eventBookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Ticket size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">{t('admin.events.noBookingsRecorded', 'No bookings recorded for this event yet')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {eventBookings.map((b) => (
                      <div key={b.booking_id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <p className="font-bold font-mono text-slate-900">{b.booking_id}</p>
                          <p className="text-slate-500 text-[11px]">{b.attendee_name} · {b.attendee_email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-slate-900">{formatCurrency(b.total_price)}</p>
                          <span className="text-[10px] text-emerald-600 font-bold">{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ATTENDEES */}
            {activeTab === 'attendees' && (
              <div className="space-y-3">
                {eventBookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">{t('admin.events.noRegisteredAttendees', 'No registered attendees')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {eventBookings.map((b) => (
                      <div key={b.booking_id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {b.attendee_name ? b.attendee_name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{b.attendee_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{b.attendee_email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              {t('admin.events.eventSlug', 'Event Slug:')} {event.slug}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm cursor-pointer"
            >
              {t('admin.common.close', 'Close')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
