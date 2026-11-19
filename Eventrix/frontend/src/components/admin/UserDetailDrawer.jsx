import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Phone, Building2, Calendar, Shield, 
  UserCheck, UserX, Ticket, CreditCard, Clock, 
  Edit3, Trash2, Key, Check, AlertCircle, RefreshCw,
  ExternalLink, ChevronRight, Lock
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

export function UserDetailDrawer({ isOpen, onClose, userId, onUserUpdated, showToast }) {
  const { t, translateEvent } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'bookings' | 'edit'
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    role: 'PARTICIPANT',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load detailed user information
  const loadUserDetail = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.adminGetUserDetail(userId);
      setUser(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        organization: data.organization || '',
        role: data.role || 'PARTICIPANT',
        password: '',
      });
    } catch (err) {
      console.error('Failed to load user details:', err);
      setError(err.message || t('admin.users.failedLoadDetails', 'Failed to load user details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      setActiveTab('overview');
      setShowDeleteConfirm(false);
      loadUserDetail();
    } else {
      setUser(null);
    }
  }, [isOpen, userId]);

  // Handle Edit Save
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        organization: editForm.organization,
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await api.adminUpdateUser(userId, payload);
      if (showToast) showToast(res.message || t('admin.users.updateSuccess', 'User details updated successfully'));
      await loadUserDetail();
      if (onUserUpdated) onUserUpdated();
      setActiveTab('overview');
    } catch (err) {
      if (showToast) showToast(err.message || t('admin.users.updateFailed', 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active/Deactivated
  const handleToggleStatus = async () => {
    if (!user) return;
    if (user.is_superuser) {
      if (showToast) showToast(t('admin.users.superuserDeactivateWarn', 'Superuser accounts cannot be deactivated.'));
      return;
    }
    const nextActive = !user.is_active;
    try {
      await api.adminUpdateUser(userId, { is_active: nextActive });
      if (showToast) showToast(`${t('admin.users.accountIsNow', 'User account is now')} ${nextActive ? t('admin.common.active', 'Active') : t('admin.common.deactivated', 'Deactivated')}`);
      await loadUserDetail();
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || t('admin.users.statusFailed', 'Failed to update status'));
    }
  };

  // Handle Delete
  const handleDeleteUser = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const res = await api.adminDeleteUser(userId);
      if (showToast) showToast(res.message || t('admin.users.deleteSuccess', 'User deleted successfully'));
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (err) {
      if (showToast) showToast(err.message || t('admin.users.deleteFailed', 'Failed to delete user'));
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm cursor-pointer"
        />

        {/* Slide-out Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white shadow-2xl z-10 flex flex-col h-full font-sans border-l border-slate-200"
        >
          {/* Top Header */}
          <div className="px-6 py-5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {t('admin.users.drawerTitle', 'User Details')}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: #{userId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-4 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('admin.users.tabOverview', 'Overview & Profile')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bookings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t('admin.users.tabBookings', 'Booking History')}</span>
              {user?.stats?.total_bookings > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-extrabold">
                  {user.stats.total_bookings}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 size={13} />
              <span>{t('admin.users.tabEdit', 'Edit Details')}</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">{t('admin.users.loadingProfile', 'Loading user profile details...')}</p>
              </div>
            )}

            {!loading && error && (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
                <AlertCircle size={24} className="text-rose-600 mx-auto" />
                <p className="text-xs font-bold text-rose-700">{error}</p>
                <Button size="sm" variant="outline" onClick={loadUserDetail}>
                  {t('admin.common.retry', 'Retry')}
                </Button>
              </div>
            )}

            {!loading && !error && user && (
              <>
                {/* ── TAB 1: OVERVIEW & PROFILE ── */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    
                    {/* User Profile Card */}
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                            user.role === 'ADMIN'
                              ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/20'
                              : user.role === 'ORGANIZER'
                              ? 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-blue-500/20'
                              : 'bg-gradient-to-br from-[#075985] to-[#0284C7] shadow-sky-500/20'
                          }`}>
                            {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-slate-900">
                                {user.full_name}
                              </h4>
                              {user.is_superuser && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  {t('admin.users.superuser', 'Superuser')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              @{user.username}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {user.is_active ? t('admin.common.active', 'Active') : t('admin.common.disabled', 'Disabled')}
                        </span>
                      </div>

                      {/* Contact Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {t('admin.users.emailAddress', 'Email Address')}
                          </span>
                          <p className="font-semibold text-slate-800 break-all flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            {user.email || '—'}
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {t('admin.users.phoneNumber', 'Phone Number')}
                          </span>
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            {user.phone || t('admin.users.notProvided', 'Not provided')}
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {t('admin.users.organization', 'Organization / Brand')}
                          </span>
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            {user.organization || t('admin.users.individual', 'Individual')}
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {t('admin.users.systemRole', 'System Role')}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : user.role === 'ORGANIZER'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial & Activity Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">
                          {t('admin.users.totalSpent', 'Total Spent')}
                        </span>
                        <p className="text-base font-black text-indigo-700 font-mono mt-0.5">
                          {formatCurrency(user.stats?.total_spent || 0)}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                          {t('admin.common.confirmed', 'Confirmed')}
                        </span>
                        <p className="text-base font-black text-emerald-700 font-mono mt-0.5">
                          {user.stats?.confirmed_bookings || 0}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {t('admin.users.statBookings', 'Bookings')}
                        </span>
                        <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                          {user.stats?.total_bookings || 0}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                          {t('admin.common.cancelled', 'Cancelled')}
                        </span>
                        <p className="text-base font-black text-rose-700 font-mono mt-0.5">
                          {user.stats?.cancelled_bookings || 0}
                        </p>
                      </div>
                    </div>

                    {/* Timeline & Metadata */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">{t('admin.users.registeredDate', 'Registered Date:')}</span>
                        <span className="font-semibold text-slate-800">{formatDate(user.date_joined)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">{t('admin.users.lastLogin', 'Last Login:')}</span>
                        <span className="font-semibold text-slate-800">
                          {user.last_login ? formatDate(user.last_login) : t('admin.users.neverLoggedIn', 'Never logged in')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">{t('admin.users.staffPrivileges', 'Staff Privileges:')}</span>
                        <span className="font-semibold text-slate-800">
                          {user.is_staff ? t('admin.users.granted', 'Yes (Granted)') : t('admin.users.standard', 'No (Standard)')}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="pt-2 flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={user.is_superuser}
                        className="w-full font-bold text-xs text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer disabled:opacity-50"
                        title={user.is_superuser ? t('admin.users.cannotDeleteSuperuser', 'Superuser accounts cannot be deleted') : t('admin.users.deleteAccount', 'Delete user account')}
                      >
                        <Trash2 size={15} className="mr-1.5 text-rose-600" />
                        <span>{t('admin.users.deleteAccount', 'Delete Account')}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setActiveTab('edit')}
                        className="w-full font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 size={15} className="mr-1.5" />
                        <span>{t('admin.users.tabEdit', 'Edit Details')}</span>
                      </Button>
                    </div>

                    {/* Delete Confirmation Box on Overview Tab */}
                    {showDeleteConfirm && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-start gap-2.5 text-rose-800">
                          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <p className="text-xs font-bold">{t('admin.users.confirmDeleteTitle', `Permanently delete user @${user.username}?`)}</p>
                            <p className="text-[11px] text-rose-600 mt-0.5">
                              {t('admin.users.confirmDeleteDesc', 'This will remove the user account, profile, and their booking data. This action cannot be undone.')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="text-xs"
                          >
                            {t('admin.common.cancel', 'Cancel')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={deleting}
                            onClick={handleDeleteUser}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            {deleting ? t('admin.common.deleting', 'Deleting...') : t('admin.users.yesDelete', 'Yes, Delete Account')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* ── TAB 2: BOOKINGS HISTORY ── */}
                {activeTab === 'bookings' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {t('admin.users.eventReservations', 'Event Reservations')} ({user.bookings?.length || 0})
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {t('admin.users.totalVolume', 'Total Volume:')} {formatCurrency(user.stats?.total_spent || 0)}
                      </span>
                    </div>

                    {(!user.bookings || user.bookings.length === 0) ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                        <Ticket size={28} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">{t('admin.users.noBookingsYet', 'No bookings yet')}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{t('admin.users.noBookingsDesc', "This user hasn't registered for any events.")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {user.bookings.map((b) => (
                          <div 
                            key={b.id || b.booking_id}
                            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                  {translateEvent({ title: b.event_title }).title || b.event_title}
                                </h5>
                                <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {b.booking_id}
                                </span>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : b.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {b.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                              <span>{formatDate(b.booked_at)} · {b.quantity} {t('admin.users.seatsCount', 'Seat(s)')}</span>
                              <span className="font-mono font-bold text-slate-900">
                                {formatCurrency(b.total_price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 3: EDIT USER DETAILS ── */}
                {activeTab === 'edit' && (
                  <form onSubmit={handleSaveEdit} className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {t('admin.users.firstName', 'First Name')}
                        </label>
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {t('admin.users.lastName', 'Last Name')}
                        </label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {t('admin.users.emailAddress', 'Email Address')}
                      </label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {t('admin.users.phoneNumber', 'Phone Number')}
                        </label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                          placeholder="+91 9876543210"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {t('admin.users.systemRole', 'System Role')}
                        </label>
                        <select
                          disabled={user.is_superuser}
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 outline-none cursor-pointer"
                        >
                          <option value="PARTICIPANT">{t('admin.users.roleParticipant', 'Participant (Attendee)')}</option>
                          <option value="ORGANIZER">{t('admin.users.roleOrganizer', 'Event Organizer')}</option>
                          <option value="ADMIN">{t('admin.users.roleAdmin', 'System Administrator')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {t('admin.users.organization', 'Organization / Company')}
                      </label>
                      <input
                        type="text"
                        value={editForm.organization}
                        onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                        placeholder="Organization name"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {t('admin.users.resetPassword', 'Reset Password')} <span className="text-slate-400 font-normal">({t('admin.users.leaveBlankPassword', 'Leave blank to keep current')})</span>
                      </label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                          placeholder={t('admin.users.newPasswordPlaceholder', 'Enter new temporary password')}
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-bold cursor-pointer"
                        disabled={user.is_superuser}
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        <span>{t('admin.users.deleteUser', 'Delete User')}</span>
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          onClick={() => setActiveTab('overview')}
                          className="text-xs cursor-pointer"
                        >
                          {t('admin.common.cancel', 'Cancel')}
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="md"
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 cursor-pointer"
                        >
                          {saving ? t('admin.common.saving', 'Saving...') : t('admin.common.saveChanges', 'Save Changes')}
                        </Button>
                      </div>
                    </div>

                    {/* Delete Confirmation Box */}
                    {showDeleteConfirm && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 mt-4">
                        <div className="flex items-start gap-2.5 text-rose-800">
                          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <p className="text-xs font-bold">{t('admin.users.confirmDeleteTitle', `Permanently delete user @${user.username}?`)}</p>
                            <p className="text-[11px] text-rose-600 mt-0.5">
                              {t('admin.users.confirmDeleteUserDesc', 'This will remove the user account and associated profile. This action cannot be undone.')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="text-xs cursor-pointer"
                          >
                            {t('admin.common.cancel', 'Cancel')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={deleting}
                            onClick={handleDeleteUser}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                          >
                            {deleting ? t('admin.common.deleting', 'Deleting...') : t('admin.users.yesDelete', 'Yes, Delete Account')}
                          </Button>
                        </div>
                      </div>
                    )}

                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
