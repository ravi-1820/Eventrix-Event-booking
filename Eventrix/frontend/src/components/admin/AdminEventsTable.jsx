import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, CalendarDays, MapPin, Users, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { formatDate, formatCurrency } from '../../lib/utils';

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const STATUS_STYLES = {
  DRAFT:      'bg-slate-100 text-slate-700',
  PUBLISHED:  'bg-[#E0F2FE] text-[#075985] font-bold',
  ONGOING:    'bg-emerald-50 text-emerald-700 font-bold',
  COMPLETED:  'bg-slate-100 text-slate-600',
  CANCELLED:  'bg-rose-50 text-rose-700 font-bold',
};

function EventRow({ event, onStatusChange, onDelete, onEdit, index }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatusLoading(true);
    try {
      await onStatusChange(event.slug, newStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(event.slug);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="bg-surface-container-lowest shadow-sm hover:shadow-md rounded-2xl p-space-md flex items-center gap-space-md hover:border-primary/30 border border-surface-container-low transition-all group"
    >
      {/* Banner thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-high">
        <img
          src={event.banner_url}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-headline-sm text-headline-sm text-on-surface truncate">{event.title}</p>
          {event.is_featured && (
            <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
              ⭐ Featured
            </span>
          )}
        </div>
        <div className="flex items-center gap-space-sm mt-1 flex-wrap">
          <span className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
            <CalendarDays size={11} className="text-primary" />
            {formatDate(event.start_time)}
          </span>
          <span className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
            <MapPin size={11} className="text-secondary" />
            {event.city}
          </span>
          <span className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
            <Users size={11} className="text-tertiary" />
            {event.booked_count ?? 0} / {event.capacity}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-label-md text-xs font-bold text-on-surface">
            {parseFloat(event.ticket_price) === 0 ? 'FREE' : formatCurrency(event.ticket_price)}
          </span>
          {event.category_details?.name && (
            <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] bg-surface-container-high text-on-surface-variant">
              {event.category_details.name}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`hidden sm:inline-flex px-3 py-1 rounded-full font-label-sm text-[11px] font-bold shrink-0 ${STATUS_STYLES[event.status] || STATUS_STYLES.DRAFT}`}>
        {event.status}
      </span>

      {/* Status dropdown */}
      <div className="relative shrink-0">
        <select
          value={event.status}
          onChange={handleStatusChange}
          disabled={statusLoading}
          className="appearance-none bg-surface-container-high border border-surface-container rounded-xl px-3 py-1.5 font-label-sm text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer disabled:opacity-50 pr-6"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {statusLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high/50 rounded-xl backdrop-blur-sm">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Delete */}
      {/* Edit + Delete */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Edit button */}
        <button
          onClick={() => onEdit(event)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
          title="Edit event"
        >
          <Pencil size={15} />
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-[11px] text-error flex items-center gap-1">
              <AlertTriangle size={11} /> Sure?
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="font-label-sm text-[11px] font-bold text-error hover:text-error-container cursor-pointer disabled:opacity-50"
            >
              {deleting ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="font-label-sm text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-error hover:bg-error transition-all cursor-pointer"
            title="Delete event"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function AdminEventsTable({ events, onStatusChange, onDelete, onEdit }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center mb-space-md shadow-inner">
          <CalendarDays size={32} className="text-on-surface-variant" />
        </div>
        <p className="font-headline-md text-headline-md text-on-surface">No events yet</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Create your first event using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {events.map((event, idx) => (
          <EventRow
            key={event.slug}
            event={event}
            index={idx}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
