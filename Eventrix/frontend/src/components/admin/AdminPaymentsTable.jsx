import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, CreditCard, RotateCcw, CheckCircle2, Clock, 
  AlertCircle, ExternalLink, ArrowDownLeft, Receipt, DollarSign, Filter
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate, formatCurrency } from '../../lib/utils';
import { getPaymentMethodInfo } from './views/AdminPaymentsView';

export function AdminPaymentsTable({ payments = [], onPaymentUpdated, showToast }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [refundingId, setRefundingId] = useState(null);

  // Metrics summary
  const metrics = useMemo(() => {
    let succeededTotal = 0;
    let freeCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    payments.forEach((p) => {
      if (p.status === 'SUCCEEDED') {
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
      freeCount,
      pendingCount,
      refundedCount,
      totalCount: payments.length,
    };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (p.booking_id && p.booking_id.toLowerCase().includes(q)) ||
        (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
        (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(q)) ||
        (p.attendee_name && p.attendee_name.toLowerCase().includes(q)) ||
        (p.attendee_email && p.attendee_email.toLowerCase().includes(q)) ||
        (p.event_title && p.event_title.toLowerCase().includes(q))
      );

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchProvider = providerFilter === 'ALL' || (
        providerFilter === 'RAZORPAY' ? p.payment_provider === 'razorpay' :
        providerFilter === 'FREE' ? (p.payment_provider === 'free' || p.amount === 0) : true
      );

      return matchSearch && matchStatus && matchProvider;
    });
  }, [payments, search, statusFilter, providerFilter]);

  const handleRefund = async (payment) => {
    if (!window.confirm(`Are you sure you want to mark transaction #${payment.id} (${formatCurrency(payment.amount)}) as REFUNDED? This will also cancel booking ${payment.booking_id}.`)) {
      return;
    }
    setRefundingId(payment.id);
    try {
      await api.adminRefundPayment(payment.id);
      if (showToast) showToast(`Payment for booking ${payment.booking_id} refunded successfully!`);
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to process refund');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="space-y-5 font-sans animate-in fade-in duration-200">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Collected Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(metrics.succeededTotal)}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block">Paid Transactions</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Free RSVPs</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {metrics.freeCount}
          </p>
          <span className="text-[10px] text-blue-600 font-bold block">Complimentary Passes</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {metrics.pendingCount}
          </p>
          <span className="text-[10px] text-amber-600 font-bold block">Awaiting Confirmation</span>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Refunded</span>
            <RotateCcw className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {metrics.refundedCount}
          </p>
          <span className="text-[10px] text-purple-600 font-bold block">Cancelled & Refunded</span>
        </div>

      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Payment ID, Booking code, attendee, or event..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {['ALL', 'SUCCEEDED', 'PENDING', 'REFUNDED'].map((st) => (
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
                {st === 'ALL' ? 'All' : st[0] + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {['ALL', 'RAZORPAY', 'FREE'].map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setProviderFilter(pr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  providerFilter === pr
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {pr === 'ALL' ? 'All Gateways' : pr === 'RAZORPAY' ? 'Razorpay' : 'Free RSVP'}
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
                <th className="py-3.5 px-4 sm:px-6">Transaction / Booking</th>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">No transactions matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isRefunding = refundingId === p.id;
                  const isFree = p.amount === 0 || p.payment_provider === 'free';
                  const methodInfo = getPaymentMethodInfo(p);
                  const MethodIcon = methodInfo.icon;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Transaction ID & Provider */}
                      <td className="py-4 px-4 sm:px-6">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {p.booking_id}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${methodInfo.className}`}>
                              <MethodIcon className="w-3 h-3 shrink-0" />
                              <span>{methodInfo.label}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                            {p.razorpay_payment_id || p.razorpay_order_id || `ID: #${p.id}`}
                          </p>

                        </div>
                      </td>

                      {/* Attendee */}
                      <td className="py-4 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {p.attendee_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {p.attendee_email}
                          </p>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={p.event_title}>
                          {p.event_title}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <span className={`font-mono font-extrabold text-sm ${
                          isFree ? 'text-blue-600' : 'text-slate-900'
                        }`}>
                          {isFree ? 'FREE' : formatCurrency(p.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
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
                          {p.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4">
                        <span className="text-slate-500 text-[11px]">
                          {formatDate(p.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'SUCCEEDED' && !isFree && (
                            <button
                              type="button"
                              disabled={isRefunding}
                              onClick={() => handleRefund(p)}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Mark as refunded"
                            >
                              <RotateCcw className={`w-3 h-3 ${isRefunding ? 'animate-spin' : ''}`} />
                              <span>Refund</span>
                            </button>
                          )}
                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                              title="View official receipt"
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

    </div>
  );
}
