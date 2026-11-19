import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Ticket, DollarSign, BarChart3, Users, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

export function AdminStatCards({ stats, isAdmin = false }) {
  const { t } = useLanguage();
  if (!stats) return null;

  const baseCards = [
    {
      key: 'total_events',
      label: isAdmin ? t('admin.platformEvents', 'Platform Events') : t('admin.totalEvents', 'Total Events'),
      icon: CalendarDays,
      accent: '#0284C7',
      bgLight: 'bg-sky-50',
      borderLight: 'border-sky-200/60',
      format: (v) => v,
    },
    ...(isAdmin ? [{
      key: 'total_users',
      label: t('admin.registeredUsers', 'Registered Users'),
      icon: Users,
      accent: '#6366F1',
      bgLight: 'bg-indigo-50',
      borderLight: 'border-indigo-200/60',
      format: (v) => v,
    }] : []),
    {
      key: 'total_tickets_sold',
      label: t('admin.ticketsSold', 'Tickets Sold'),
      icon: Ticket,
      accent: '#F43F5E',
      bgLight: 'bg-rose-50',
      borderLight: 'border-rose-200/60',
      format: (v) => v,
    },
    {
      key: 'total_revenue',
      label: t('admin.totalRevenue', 'Total Revenue'),
      icon: DollarSign,
      accent: '#10B981',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200/60',
      format: (v) => formatCurrency(v),
    },
    ...(isAdmin ? [{
      key: 'total_payments',
      label: t('admin.transactions', 'Transactions'),
      icon: CreditCard,
      accent: '#8B5CF6',
      bgLight: 'bg-purple-50',
      borderLight: 'border-purple-200/60',
      format: (v) => v,
    }] : []),
    {
      key: 'utilization_rate',
      label: t('admin.capacityFillRate', 'Capacity Fill Rate'),
      icon: BarChart3,
      accent: '#F59E0B',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200/60',
      format: (v) => `${v}%`,
      showBar: true,
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
      {baseCards.map((card, idx) => {
        const Icon = card.icon;
        const value = stats[card.key] ?? 0;

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            whileHover={{ y: -3 }}
            className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200 flex flex-col justify-between border border-slate-200/80 group"
          >
            {/* Icon pill */}
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-2xl ${card.bgLight} border ${card.borderLight} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon size={18} style={{ color: card.accent }} />
              </div>
              {card.showBar && (
                <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                  {value}%
                </span>
              )}
            </div>

            {/* Value */}
            <div>
              <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 leading-none tracking-tight">
                {card.format(value)}
              </p>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-2 truncate">
                {card.label}
              </p>
            </div>

            {/* Mini progress bar for capacity */}
            {card.showBar && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(value, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: card.accent }}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

