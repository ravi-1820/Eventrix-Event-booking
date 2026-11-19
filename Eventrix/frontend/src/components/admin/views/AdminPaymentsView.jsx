import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, CreditCard, RotateCcw, CheckCircle2, Clock, 
  AlertCircle, ExternalLink, ArrowDownLeft, Receipt, DollarSign, Filter,
  ShieldCheck, RefreshCw, ChevronRight, X,
  Banknote, Smartphone, Wallet, Building2, Ticket, HelpCircle
} from 'lucide-react';
import { api } from '../../../api/client';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export function getPaymentMethodInfo(payment, t = (k, d) => d) {
  const method = (payment?.payment_method || '').toLowerCase().trim();
  const provider = (payment?.payment_provider || '').toLowerCase().trim();
  const isFree = payment?.amount === 0 || provider === 'free';

  if (isFree) {
    return {
      label: t('admin.payments.freePass', 'Free Pass'),
      icon: Ticket,
      className: 'bg-slate-100 text-slate-700 border-slate-200/80',
    };
  }

  if (method === 'cash' || provider === 'cash') {
    return {
      label: t('admin.payments.cash', 'Cash'),
      icon: Banknote,
      className: 'bg-amber-50 text-amber-700 border-amber-200/80',
    };
  }

  if (method === 'card') {
    return {
      label: t('admin.payments.card', 'Card'),
      icon: CreditCard,
      className: 'bg-blue-50 text-blue-700 border-blue-200/80',
    };
  }

  if (method === 'upi') {
    return {
      label: t('admin.payments.upi', 'UPI'),
      icon: Smartphone,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    };
  }

  if (method === 'wallet') {
    return {
      label: t('admin.payments.wallet', 'Wallet'),
      icon: Wallet,
      className: 'bg-amber-50 text-amber-700 border-amber-200/80',
    };
  }

  if (method === 'netbanking' || method === 'net_banking' || method === 'net banking') {
    return {
      label: t('admin.payments.netBanking', 'Net Banking'),
      icon: Building2,
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    };
  }

  if (!method) {
    if (payment?.status === 'PENDING') {
      return {
        label: t('admin.common.pending', 'Pending'),
        icon: Clock,
        className: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    }
    return {
      label: t('admin.payments.notRecorded', 'Not recorded'),
      icon: HelpCircle,
      className: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }

  return {
    label: method.charAt(0).toUpperCase() + method.slice(1),
    icon: CreditCard,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

export function AdminPaymentsView({ payments = [], onPaymentUpdated, showToast }) {
  const { t, translateEvent } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [refundingId, setRefundingId] = useState(null);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);

  // Metrics summary
  const metrics = useMemo(() => {
    let succeededTotal = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let freeCount = 0;

    payments.forEach((p) => {
      if (p.status === 'SUCCEEDED') {
        successfulCount++;
        if (p.amount === 0 || p.payment_provider === 'free') {
          freeCount++;
        } else {
          succeededTotal += p.amount;
        }
      } else if (p.status === 'PENDING') {
        pendingCount++;
      } else if (p.status === 'REFUNDED') {
        refundedCount++;
      }
    });

    return {
      succeededTotal,
      successfulCount,
      pendingCount,
      refundedCount,
      freeCount,
      totalCount: payments.length,
    };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase().trim();
      const pMethod = (p.payment_method || '').toLowerCase().trim();
      const pProvider = (p.payment_provider || '').toLowerCase().trim();
      const isFree = p.amount === 0 || pProvider === 'free';

      const matchSearch = !q || (
        (p.booking_id && p.booking_id.toLowerCase().includes(q)) ||
        (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
        (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(q)) ||
        (p.attendee_name && p.attendee_name.toLowerCase().includes(q)) ||
        (p.attendee_email && p.attendee_email.toLowerCase().includes(q)) ||
        (p.event_title && p.event_title.toLowerCase().includes(q)) ||
        (pMethod && pMethod.includes(q)) ||
        (pProvider && pProvider.includes(q))
      );

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      const matchMethod = methodFilter === 'ALL' || (
        methodFilter === 'CARD' ? pMethod === 'card' :
        methodFilter === 'UPI' ? pMethod === 'upi' :
        methodFilter === 'WALLET' ? pMethod === 'wallet' :
        methodFilter === 'CASH' ? (pMethod === 'cash' || pProvider === 'cash') :
        methodFilter === 'NETBANKING' ? (pMethod === 'netbanking' || pMethod === 'net_banking' || pMethod === 'net banking') :
        methodFilter === 'FREE' ? isFree : true
      );

      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const handleRefund = async (payment) => {
    if (!window.confirm(`Are you sure you want to mark transaction #${payment.id} (${formatCurrency(payment.amount)}) as REFUNDED? This will void reservation ${payment.booking_id}.`)) {
      return;
    }
    setRefundingId(payment.id);
    try {
      await api.adminRefundPayment(payment.id);
      if (showToast) showToast(t('admin.payments.refundSuccess', `Payment for reservation ${payment.booking_id} refunded successfully!`));
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || t('admin.payments.refundFailed', 'Failed to process refund'));
    } finally {
      setRefundingId(null);
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'SUCCEEDED': return t('admin.common.succeeded', 'Succeeded');
      case 'PENDING': return t('admin.common.pending', 'Pending');
      case 'REFUNDED': return t('admin.common.refunded', 'Refunded');
      case 'FAILED': return t('admin.common.failed', 'Failed');
      default: return st;
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              {t('admin.payments.title', 'Payment & Settlement Management')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {t('admin.payments.subtitle', 'Real-time reconciliation of all customer transactions, Razorpay gateway settlements, and instant refund processing.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('admin.payments.razorpayLive', 'Razorpay Live')}
          </span>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.payments.totalRevenue', 'Total Revenue')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-mono text-slate-900">
              {formatCurrency(metrics.succeededTotal)}
            </p>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> {t('admin.payments.settledFunds', 'Settled Funds')}
            </span>
          </div>
        </div>

        {/* Successful Payments */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.payments.successfulPayments', 'Successful Payments')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-mono text-slate-900">
              {metrics.successfulCount}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              {metrics.freeCount} {t('admin.payments.freePassesIncluded', 'Free passes included')}
            </span>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.payments.pendingPayments', 'Pending Payments')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-mono text-slate-900">
              {metrics.pendingCount}
            </p>
            <span className="text-[11px] text-amber-600 font-bold mt-1 block">
              {t('admin.payments.awaitingWebhook', 'Awaiting Gateway Webhook')}
            </span>
          </div>
        </div>

        {/* Refunds */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('admin.payments.refunds', 'Refunds')}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-mono text-slate-900">
              {metrics.refundedCount}
            </p>
            <span className="text-[11px] text-purple-600 font-bold mt-1 block">
              {t('admin.payments.voidedTransactions', 'Voided Transactions')}
            </span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.payments.searchPlaceholder', 'Search by Payment ID, Booking code, attendee, or event...')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'ALL', label: t('admin.common.allStatus', 'All Status') },
              { id: 'SUCCEEDED', label: t('admin.common.succeeded', 'Succeeded') },
              { id: 'PENDING', label: t('admin.common.pending', 'Pending') },
              { id: 'REFUNDED', label: t('admin.common.refunded', 'Refunded') },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl flex-wrap">
            {[
              { id: 'ALL', label: t('admin.payments.allMethods', 'All Methods') },
              { id: 'CARD', label: t('admin.payments.card', 'Card') },
              { id: 'UPI', label: t('admin.payments.upi', 'UPI') },
              { id: 'WALLET', label: t('admin.payments.wallet', 'Wallet') },
              { id: 'CASH', label: t('admin.payments.cash', 'Cash') },
              { id: 'NETBANKING', label: t('admin.payments.netBanking', 'Net Banking') },
              { id: 'FREE', label: t('admin.payments.freePass', 'Free Pass') },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethodFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  methodFilter === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">{t('admin.payments.thPaymentId', 'Payment ID')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thBookingId', 'Booking ID')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thCustomer', 'Customer')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thEvent', 'Event')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thAmount', 'Amount')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thMethod', 'Method')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thStatus', 'Status')}</th>
                <th className="py-3.5 px-4">{t('admin.payments.thDate', 'Date')}</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">{t('admin.payments.thActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">{t('admin.payments.noRecords', 'No payment records found')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('admin.payments.adjustSearch', 'Try adjusting your search criteria or filters.')}</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isRefunding = refundingId === p.id;
                  const isFree = p.amount === 0 || p.payment_provider === 'free';
                  const methodInfo = getPaymentMethodInfo(p, t);
                  const MethodIcon = methodInfo.icon;
                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedPaymentDetail(p)}
                    >
                      {/* Payment ID */}
                      <td className="py-4 px-4 sm:px-6">
                        <div>
                          <span className="font-mono font-bold text-slate-900 block truncate max-w-[130px]">
                            {p.razorpay_payment_id || `TXN-#${p.id}`}
                          </span>
                          {p.razorpay_order_id && (
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[130px]">
                              {p.razorpay_order_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Booking ID */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {p.booking_id}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {p.attendee_name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {p.attendee_email}
                          </p>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-[180px]" title={p.event_title}>
                          {translateEvent({ title: p.event_title }).title || p.event_title}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <span className={`font-mono font-black text-sm ${
                          isFree ? 'text-blue-600' : 'text-slate-900'
                        }`}>
                          {isFree ? t('admin.common.free', 'FREE') : formatCurrency(p.amount)}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${methodInfo.className}`}>
                          <MethodIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{methodInfo.label}</span>
                        </span>
                      </td>


                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'SUCCEEDED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'REFUNDED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : p.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'SUCCEEDED' ? 'bg-emerald-500' :
                            p.status === 'REFUNDED' ? 'bg-purple-500' :
                            p.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {getStatusLabel(p.status)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'SUCCEEDED' && !isFree && (
                            <button
                              type="button"
                              disabled={isRefunding}
                              onClick={() => handleRefund(p)}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                              title={t('admin.payments.refundTitle', 'Mark as refunded & cancel ticket')}
                            >
                              <RotateCcw className={`w-3 h-3 ${isRefunding ? 'animate-spin' : ''}`} />
                              <span>{t('admin.payments.refund', 'Refund')}</span>
                            </button>
                          )}
                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                              title={t('admin.payments.viewReceipt', 'View official receipt')}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
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

      {/* Transaction Detail Slide-Over Modal */}
      <AnimatePresence>
        {selectedPaymentDetail && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPaymentDetail(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {t('admin.payments.transactionDetails', 'Transaction Details')}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedPaymentDetail.booking_id}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Amount card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('admin.payments.settledAmount', 'Settled Amount')}</span>
                  <p className="text-3xl font-black font-mono text-slate-900 mt-1">
                    {selectedPaymentDetail.amount === 0 ? t('admin.common.free', 'FREE') : formatCurrency(selectedPaymentDetail.amount)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedPaymentDetail.status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-800' :
                      selectedPaymentDetail.status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {getStatusLabel(selectedPaymentDetail.status)}
                    </span>
                  </div>
                </div>

                {/* Gateway Metadata */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('admin.payments.gatewayTelemetry', 'Payment & Gateway Telemetry')}
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('admin.payments.paymentMethod', 'Payment Method')}</span>
                      <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                        {(() => {
                          const drawerMethod = getPaymentMethodInfo(selectedPaymentDetail, t);
                          const DrawerIcon = drawerMethod.icon;
                          return (
                            <>
                              <DrawerIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span>{drawerMethod.label}</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('admin.payments.paymentProvider', 'Payment Provider')}</span>
                      <span className="font-bold text-slate-900 uppercase">
                        {selectedPaymentDetail.payment_provider || (selectedPaymentDetail.amount === 0 ? t('admin.payments.freeRsvp', 'Free RSVP') : 'Razorpay')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('admin.payments.paymentId', 'Payment ID')}</span>
                      <span className="font-mono text-slate-700 font-medium">{selectedPaymentDetail.razorpay_payment_id || `TXN-#${selectedPaymentDetail.id}`}</span>
                    </div>
                    {selectedPaymentDetail.razorpay_order_id && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('admin.payments.orderId', 'Order ID')}</span>
                        <span className="font-mono text-slate-700 font-medium">{selectedPaymentDetail.razorpay_order_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('admin.payments.transactionStatus', 'Transaction Status')}</span>
                      <span className="font-bold text-slate-900">{getStatusLabel(selectedPaymentDetail.status)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('admin.payments.timestamp', 'Timestamp')}</span>
                      <span className="font-medium text-slate-700">{formatDate(selectedPaymentDetail.created_at)}</span>
                    </div>
                  </div>
                </div>


                {/* Attendee Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('admin.payments.customerAndEvent', 'Customer & Event')}
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('admin.payments.customerName', 'Customer Name')}</span>
                      <span className="font-bold text-slate-900">{selectedPaymentDetail.attendee_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('admin.payments.email', 'Email')}</span>
                      <span className="font-medium text-slate-700">{selectedPaymentDetail.attendee_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('admin.payments.event', 'Event')}</span>
                      <span className="font-bold text-slate-900 line-clamp-1">{translateEvent({ title: selectedPaymentDetail.event_title }).title || selectedPaymentDetail.event_title}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                {selectedPaymentDetail.status === 'SUCCEEDED' && selectedPaymentDetail.amount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRefund(selectedPaymentDetail);
                      setSelectedPaymentDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    {t('admin.payments.issueRefund', 'Issue Refund')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('admin.common.close', 'Close')}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
