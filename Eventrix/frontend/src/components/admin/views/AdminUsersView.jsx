import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Shield, UserCheck, UserX, 
  Filter, Mail, Phone, Calendar, Check, AlertCircle, 
  RefreshCw, ChevronDown, Award, Eye, Pencil, Building2,
  DollarSign, ArrowUpRight, ShieldCheck, Download, Trash2
} from 'lucide-react';
import { api } from '../../../api/client';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { Dialog, DialogContent } from '../../ui/dialog';
import { UserDetailDrawer } from '../UserDetailDrawer';
import { CreateUserModal } from '../CreateUserModal';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminUsersView({ showToast }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  // Modals & Drawers
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Load Users from backend API
  const loadUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await api.adminGetUsers();
      setUsers(Array.isArray(res.users) ? res.users : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.organization && u.organization.toLowerCase().includes(q))
      );

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || (
        statusFilter === 'ACTIVE' ? u.is_active : !u.is_active
      );

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const organizers = users.filter(u => u.role === 'ORGANIZER').length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const participants = users.filter(u => u.role === 'PARTICIPANT').length;
    const totalRevenue = users.reduce((acc, u) => acc + (u.total_spent || 0), 0);

    return { total, active, organizers, admins, participants, totalRevenue };
  }, [users]);

  // Handle Quick Role Change in Table
  const handleRoleChange = async (user, newRole) => {
    if (user.role === newRole) return;
    setUpdatingId(user.id);
    try {
      await api.adminUpdateUser(user.id, { role: newRole });
      if (showToast) showToast(`Updated ${user.username}'s role to ${newRole}`);
      await loadUsers(true);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Delete User Confirmation
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await api.adminDeleteUser(userToDelete.id);
      if (showToast) showToast(res.message || `User @${userToDelete.username} deleted successfully`);
      setUserToDelete(null);
      await loadUsers(true);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete user');
    } finally {
      setDeletingUser(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (user) => {
    if (user.is_superuser) {
      if (showToast) showToast('Superuser account cannot be deactivated.');
      return;
    }
    const nextActive = !user.is_active;
    setUpdatingId(user.id);
    try {
      await api.adminUpdateUser(user.id, { is_active: nextActive });
      if (showToast) showToast(`User @${user.username} is now ${nextActive ? 'Active' : 'Deactivated'}`);
      await loadUsers(true);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update user status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Export CSV
  const exportUsersCSV = () => {
    if (filteredUsers.length === 0) {
      if (showToast) showToast('No user records to export.');
      return;
    }

    const headers = ['User ID', 'Username', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Total Bookings', 'Total Spent', 'Registered Date'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${u.username}"`,
      `"${u.full_name}"`,
      `"${u.email || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.role}"`,
      u.is_active ? 'Active' : 'Inactive',
      u.bookings_count || 0,
      u.total_spent || 0,
      `"${formatDate(u.date_joined)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eventrix_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Exported users data to CSV.');
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      
      {/* ── 1. VIEW HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('admin.usersTitle', 'User Management')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {metrics.total} {t('admin.registeredUsers', 'Registered')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('admin.usersDesc', 'Manage user accounts, assign system roles, inspect full attendee profiles and booking records.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(true)}
            disabled={refreshing || loading}
            className="text-xs text-slate-700 font-semibold gap-1.5 cursor-pointer"
            title={t('admin.refresh', 'Refresh')}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{t('admin.refresh', 'Refresh')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportUsersCSV}
            className="text-xs text-slate-700 font-semibold gap-1.5 cursor-pointer"
            title={t('admin.exportCsv', 'Export CSV')}
          >
            <Download size={14} />
            <span>{t('admin.exportCsv', 'Export CSV')}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-bold gap-1.5 bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 px-4 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>{t('admin.createUser', 'Add New User')}</span>
          </Button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {t('admin.registeredUsers', 'Total Users')}
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {metrics.total}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              {metrics.active} active accounts
            </span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Rate
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {metrics.total > 0 ? `${Math.round((metrics.active / metrics.total) * 100)}%` : '0%'}
            </p>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {metrics.total - metrics.active} disabled
            </span>
          </div>
        </div>

        {/* Organizers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {t('admin.roleOrganizer', 'Organizers')}
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {metrics.organizers}
            </p>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
              Event publishers
            </span>
          </div>
        </div>

        {/* Administrators */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {t('admin.roleAdmin', 'Administrators')}
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {metrics.admins}
            </p>
            <span className="text-[10px] text-purple-600 font-bold block mt-0.5">
              Platform staff
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchUsers', 'Search users by name, username, email, phone, or organization...')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {['ALL', 'PARTICIPANT', 'ORGANIZER', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r === 'ALL' ? t('admin.allRoles', 'All Roles') : r === 'PARTICIPANT' ? t('admin.roleAttendee', 'Attendee') : r === 'ORGANIZER' ? t('admin.roleOrganizer', 'Organizer') : t('admin.roleAdmin', 'Admin')}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'ALL' ? t('admin.allStatus', 'All') : s === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. USERS TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">{t('common.loading', 'Loading platform users...')}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle size={28} className="text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <Button size="sm" variant="outline" onClick={() => loadUsers(true)}>
              {t('common.back', 'Retry')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{t('admin.colUser', 'User Account')}</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">{t('admin.colRole', 'System Role')}</th>
                  <th className="py-3.5 px-4">{t('admin.bookings', 'Bookings & Activity')}</th>
                  <th className="py-3.5 px-4">{t('admin.colStatus', 'Status')}</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">{t('admin.colAction', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <UserX className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-700">{t('admin.noUsersFound', 'No users found')}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or filter options.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUpdating = updatingId === u.id;
                    return (
                      <tr 
                        key={u.id} 
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        {/* User Identity */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                              u.role === 'ADMIN' 
                                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200' 
                                : u.role === 'ORGANIZER'
                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                                : 'bg-[#E0F2FE] text-[#075985]'
                            }`}>
                              {u.first_name ? u.first_name[0].toUpperCase() : u.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                  {u.full_name}
                                </p>
                                {u.is_superuser && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                    Superuser
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                                @{u.username} · ID: #{u.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5">
                            <p className="text-slate-800 flex items-center gap-1.5 truncate font-medium">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{u.email || '—'}</span>
                            </p>
                            {u.phone ? (
                              <p className="text-slate-400 text-[11px] flex items-center gap-1.5">
                                <Phone size={12} className="shrink-0" />
                                <span>{u.phone}</span>
                              </p>
                            ) : u.organization ? (
                              <p className="text-slate-400 text-[11px] flex items-center gap-1.5 truncate">
                                <Building2 size={12} className="shrink-0" />
                                <span>{u.organization}</span>
                              </p>
                            ) : null}
                          </div>
                        </td>

                        {/* System Role Selector */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              disabled={isUpdating || u.is_superuser}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer pr-7 appearance-none focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-300'
                                  : u.role === 'ORGANIZER'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-300'
                              }`}
                            >
                              <option value="PARTICIPANT">{t('admin.roleAttendee', 'Participant')}</option>
                              <option value="ORGANIZER">{t('admin.roleOrganizer', 'Organizer')}</option>
                              <option value="ADMIN">{t('admin.roleAdmin', 'Administrator')}</option>
                            </select>
                            <ChevronDown size={13} className="text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>

                        {/* Bookings & Spent */}
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-bold text-slate-900">
                              {u.bookings_count || 0} Event{u.bookings_count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-[11px] text-indigo-600 font-mono font-bold mt-0.5">
                              Spent: {formatCurrency(u.total_spent || 0)}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            u.is_active 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View User Details Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserId(u.id)}
                              className="px-2.5 py-1 text-xs font-semibold gap-1 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer"
                              title={t('admin.userDetails', 'View Full Profile & Bookings')}
                            >
                              <Eye size={13} />
                              <span className="hidden sm:inline">{t('admin.details', 'Details')}</span>
                            </Button>

                            {/* Delete User Button */}
                            <button
                              type="button"
                              disabled={u.is_superuser}
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center cursor-pointer text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.is_superuser ? 'Superuser accounts cannot be deleted' : t('admin.delete', 'Delete User Account')}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. USER DETAIL DRAWER ── */}
      <UserDetailDrawer
        isOpen={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
        userId={selectedUserId}
        onUserUpdated={() => loadUsers(true)}
        showToast={showToast}
      />

      {/* ── 6. CREATE USER MODAL ── */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onUserCreated={() => loadUsers(true)}
        showToast={showToast}
      />

      {/* ── 7. DELETE CONFIRMATION DIALOG ── */}
      {userToDelete && (
        <Dialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <DialogContent 
            isOpen={Boolean(userToDelete)} 
            onClose={() => setUserToDelete(null)}
            className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-2xl font-sans"
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {t('admin.delete', 'Delete User Account?')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete user <strong className="text-slate-800">@{userToDelete.username}</strong> ({userToDelete.full_name})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setUserToDelete(null)}
                className="text-xs cursor-pointer"
              >
                {t('admin.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={deletingUser}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                {deletingUser ? t('profile.deleting', 'Deleting...') : t('admin.yesDelete', 'Yes, Delete Account')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
