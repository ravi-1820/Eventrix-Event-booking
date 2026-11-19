import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Shield, UserCheck, UserX, Filter, Mail, Phone, 
  Calendar, Check, AlertCircle, RefreshCw, ChevronDown, Award
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate, formatCurrency } from '../../lib/utils';

export function AdminUsersTable({ users = [], onUserUpdated, showToast }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
      );

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || (
        statusFilter === 'ACTIVE' ? u.is_active : !u.is_active
      );

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleRoleChange = async (user, newRole) => {
    if (user.role === newRole) return;
    setUpdatingId(user.id);
    try {
      await api.adminUpdateUser(user.id, { role: newRole });
      if (showToast) showToast(`Updated ${user.username}'s role to ${newRole}`);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user) => {
    if (user.is_superuser) {
      if (showToast) showToast('Superuser account cannot be deactivated.');
      return;
    }
    const nextActive = !user.is_active;
    setUpdatingId(user.id);
    try {
      await api.adminUpdateUser(user.id, { is_active: nextActive });
      if (showToast) showToast(`User ${user.username} is now ${nextActive ? 'Active' : 'Deactivated'}`);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update user status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      
      {/* Controls Bar: Search & Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
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
                {r === 'ALL' ? 'All Roles' : r[0] + r.slice(1).toLowerCase()}
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
                {s === 'ALL' ? 'All Status' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">User / Account</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Bookings & Activity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">No users matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUpdating = updatingId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200' 
                              : u.role === 'ORGANIZER'
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                              : 'bg-[#E0F2FE] text-[#075985]'
                          }`}>
                            {u.first_name ? u.first_name[0].toUpperCase() : u.username[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">
                                {u.full_name}
                              </p>
                              {u.is_superuser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                                  SU
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              @{u.username} · ID: #{u.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-700 flex items-center gap-1 truncate font-medium">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {u.email || '—'}
                          </p>
                          {u.phone && (
                            <p className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Phone className="w-3 h-3 shrink-0" />
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-4 px-4">
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
                            <option value="PARTICIPANT">Participant</option>
                            <option value="ORGANIZER">Organizer</option>
                            <option value="ADMIN">Administrator</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Bookings & Activity */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            {u.bookings_count} Booking{u.bookings_count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Spent: {formatCurrency(u.total_spent)}
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
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          disabled={isUpdating || u.is_superuser}
                          onClick={() => handleToggleActive(u)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.is_active
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title={u.is_superuser ? 'Superuser cannot be deactivated' : (u.is_active ? 'Deactivate Account' : 'Activate Account')}
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : u.is_active ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
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
