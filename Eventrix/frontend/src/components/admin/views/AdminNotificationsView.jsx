import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, CheckCircle2, AlertCircle, Ticket, CreditCard, 
  Star, Clock, Filter, Check, Trash2, ExternalLink
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminNotificationsView({ dashData, onNavigateView }) {
  const { t, translateEvent } = useLanguage();
  const [filter, setFilter] = useState('ALL');
  const [clearedIds, setClearedIds] = useState([]);

  // Generate dynamic platform notifications from real live data
  const notifications = useMemo(() => {
    const list = [];
    const bookings = dashData?.bookings || [];
    const payments = dashData?.payments || [];
    const requirements = dashData?.custom_requirements || [];

    // Recent bookings notifications
    bookings.slice(0, 8).forEach((b, idx) => {
      const translatedTitle = translateEvent({ title: b.event_title }).title || b.event_title;
      list.push({
        id: `booking-${b.id || idx}`,
        type: 'BOOKING',
        title: t('admin.notifications.newReservationConfirmed', 'New Reservation Confirmed'),
        description: `${b.attendee_name} ${t('admin.notifications.reservedTicketsFor', 'reserved')} ${b.quantity} ${t('admin.notifications.ticketsFor', 'ticket(s) for')} "${translatedTitle}"`,
        timestamp: b.booked_at,
        icon: Ticket,
        iconBg: 'bg-emerald-50 text-emerald-600',
        route: 'bookings',
        badge: t('admin.common.confirmed', 'CONFIRMED')
      });
    });

    // Recent payments notifications
    payments.filter(p => p.status === 'SUCCEEDED' && p.amount > 0).slice(0, 5).forEach((p, idx) => {
      list.push({
        id: `payment-${p.id || idx}`,
        type: 'PAYMENT',
        title: t('admin.notifications.paymentSettled', 'Razorpay Payment Settled'),
        description: `₹${Number(p.amount).toLocaleString('en-IN')} ${t('admin.notifications.receivedFrom', 'received from')} ${p.attendee_name} ${t('admin.notifications.forOrder', 'for order')} ${p.razorpay_order_id || p.booking_id}`,
        timestamp: p.created_at,
        icon: CreditCard,
        iconBg: 'bg-blue-50 text-blue-600',
        route: 'payments',
        badge: t('admin.common.paid', 'PAID')
      });
    });

    // Pending requirements
    requirements.filter(r => !r.is_fulfilled).forEach((r, idx) => {
      list.push({
        id: `req-${r.id || idx}`,
        type: 'REQUIREMENT',
        title: t('admin.notifications.requirementNeedsReview', 'Attendee Requirement Needs Review'),
        description: `${r.attendee_name}: "${r.requirement_text}"`,
        timestamp: r.created_at || new Date().toISOString(),
        icon: AlertCircle,
        iconBg: 'bg-amber-50 text-amber-600',
        route: 'requirements',
        badge: t('admin.common.pending', 'PENDING')
      });
    });

    // Sort by timestamp desc
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [dashData, t, translateEvent]);

  const filteredList = notifications.filter(n => {
    if (clearedIds.includes(n.id)) return false;
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  const handleClearAll = () => {
    setClearedIds(notifications.map(n => n.id));
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              {t('admin.notifications.title', 'Activity & Notifications Hub')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('admin.notifications.subtitle', 'Real-time operational alerts across ticket reservations, Razorpay settlements, and VIP requests.')}
          </p>
        </div>

        {filteredList.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Check size={14} />
            <span>{t('admin.notifications.markAllRead', 'Mark all read')}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: t('admin.notifications.allActivity', 'All Activity') },
          { id: 'BOOKING', label: t('admin.notifications.reservations', 'Reservations') },
          { id: 'PAYMENT', label: t('admin.notifications.payments', 'Payments') },
          { id: 'REQUIREMENT', label: t('admin.notifications.specialRequests', 'Special Requests') },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              filter === id 
                ? 'bg-[#075985] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications Feed */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">{t('admin.notifications.allCaughtUp', 'All caught up!')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('admin.notifications.noNotifications', 'No pending notifications at this time.')}</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const IconComp = item.icon;
            return (
              <div 
                key={item.id} 
                className="p-5 hover:bg-slate-50/70 transition-colors flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                  <IconComp className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium mt-2 block">
                    {formatDate(item.timestamp)}
                  </span>
                </div>

                {item.route && onNavigateView && (
                  <button
                    type="button"
                    onClick={() => onNavigateView(item.route)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
                    title={`View in ${item.route}`}
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
