import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, ShieldCheck, Award, 
  Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Save, 
  Loader2, Ticket, LayoutDashboard, Lock, Calendar, ExternalLink,
  Eye, EyeOff, Trash2, AlertTriangle 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export function ProfilePanel({ currentUser, setCurrentUser, onNavigate, showToast }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    confirm_password: '',
  });

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load fresh profile details
  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        setFetching(true);
        const profile = await api.getProfile();
        if (mounted && profile) {
          setCurrentUser(profile);
          const data = {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            phone: profile.profile?.phone || '',
            organization: profile.profile?.organization || '',
            password: '',
            confirm_password: '',
          };
          setFormData(data);
          setInitialData(data);
        } else if (mounted && currentUser) {
          const data = {
            first_name: currentUser.first_name || '',
            last_name: currentUser.last_name || '',
            email: currentUser.email || '',
            phone: currentUser.profile?.phone || '',
            organization: currentUser.profile?.organization || '',
            password: '',
            confirm_password: '',
          };
          setFormData(data);
          setInitialData(data);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (mounted) setFetching(false);
      }
    }

    loadProfile();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({
        ...initialData,
        password: '',
        confirm_password: '',
      });
      setErrorMessage('');
      setSuccessMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.password || formData.confirm_password) {
      if (formData.password.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setErrorMessage('Passwords do not match. Please verify your confirm password.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        organization: formData.organization,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const updatedUser = await api.updateProfile(payload);
      setCurrentUser(updatedUser);
      const data = {
        first_name: updatedUser.first_name || '',
        last_name: updatedUser.last_name || '',
        email: updatedUser.email || '',
        phone: updatedUser.profile?.phone || '',
        organization: updatedUser.profile?.organization || '',
        password: '',
        confirm_password: '',
      };
      setFormData(data);
      setInitialData(data);
      setSuccessMessage('Profile updated successfully!');
      if (showToast) {
        showToast('Your profile has been updated.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      await api.deleteProfile();
      if (setCurrentUser) setCurrentUser(null);
      if (showToast) showToast('Your account has been deleted.');
      setDeleteModalOpen(false);
      if (onNavigate) onNavigate('explore');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete account.');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const isDirty = initialData && (
    formData.first_name !== initialData.first_name ||
    formData.last_name !== initialData.last_name ||
    formData.email !== initialData.email ||
    formData.phone !== initialData.phone ||
    formData.organization !== initialData.organization ||
    Boolean(formData.password) ||
    Boolean(formData.confirm_password)
  );

  const isAdmin = Boolean(
    currentUser?.profile?.role === 'ORGANIZER' ||
    currentUser?.profile?.role === 'ADMIN' ||
    currentUser?.is_staff ||
    currentUser?.is_superuser
  );

  const role = currentUser?.profile?.role || (currentUser?.is_superuser ? 'ADMIN' : 'PARTICIPANT');
  const loyalty = currentUser?.loyalty_discount_tier || {
    tier: 'Standard Patron',
    percentage: 0,
    description: 'Standard booking rate'
  };
  const confirmedCount = currentUser?.confirmed_bookings_count || 0;

  const initials = (currentUser?.first_name ? currentUser.first_name[0] : (currentUser?.username?.[0] || 'U')).toUpperCase();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 animate-in fade-in duration-200">
      
      {/* ── Top Bar Navigation ── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate && onNavigate(isAdmin ? 'dashboard' : 'explore')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#075985]" />
          <span>{isAdmin ? t('profile.backToDashboard', 'Back to Dashboard') : t('profile.backToEvents', 'Back to Events')}</span>
        </button>
        <span className="text-xs font-mono font-medium text-slate-400">
          User ID: ETX-USR-{currentUser?.id || '001'}
        </span>
      </div>

      {/* ── Profile Header Hero ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar Circle */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#075985] to-[#0284C7] text-white font-extrabold text-3xl sm:text-4xl flex items-center justify-center shadow-lg shadow-[#075985]/20 shrink-0">
              {initials}
            </div>

            {/* Name & Meta */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] font-['Plus_Jakarta_Sans'] tracking-tight">
                  {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : currentUser?.username}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] uppercase tracking-wider border border-[#BAE6FD]">
                  {role}
                </span>
                {loyalty.percentage > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF4F70]/10 text-[#FF4F70] uppercase tracking-wider border border-[#FF4F70]/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {loyalty.percentage}% {t('profile.loyaltyReward', 'Loyalty Tier')}
                  </span>
                )}
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {t('profile.verifiedAccount', 'Verified Account')}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="text-slate-700 font-semibold">@{currentUser?.username}</span>
                <span>•</span>
                <span>{currentUser?.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {isAdmin ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate && onNavigate('dashboard')}
                className="gap-2 rounded-xl shadow-md shadow-[#075985]/20 cursor-pointer w-full sm:w-auto"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t('nav.dashboard', 'Go to Dashboard')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate && onNavigate('my-bookings')}
                className="gap-2 rounded-xl border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer w-full sm:w-auto"
              >
                <Ticket className="w-4 h-4 text-[#075985]" />
                {t('booking.myBookings', 'My Bookings')} ({confirmedCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Highlights Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#075985]/10 text-[#075985] flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('profile.confirmedEvents', 'Confirmed Events')}</span>
            <span className="text-2xl font-extrabold text-[#0F172A] font-mono">{confirmedCount}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('profile.loyaltyReward', 'Loyalty Reward')}</span>
            <span className="text-2xl font-extrabold text-[#0F172A] font-mono">{loyalty.percentage}% OFF</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('profile.accessStatus', 'Access Status')}</span>
            <span className="text-lg font-bold text-[#0F172A] truncate block">{role === 'ADMIN' ? 'Full Administrator' : role === 'ORGANIZER' ? 'Event Organizer' : 'Active Patron'}</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid: Edit Form & Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Profile Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-[#0F172A]">{t('profile.personalInfo', 'Personal Information')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('profile.personalInfoDesc', 'Manage your personal and contact details for bookings.')}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{t('profile.allSavedSecurely', 'All fields saved securely')}</span>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 mb-6 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-3 mb-6 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    {t('profile.firstName', 'First Name')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="e.g. Rajan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    {t('profile.lastName', 'Last Name')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="e.g. Parmar"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  {t('profile.email', 'Email Address')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('profile.emailDesc', 'Used for ticket confirmations, invoices, and Razorpay receipts.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    {t('profile.phone', 'Phone Number')}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    {t('profile.organization', 'Organization / Company')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder="e.g. BrainyBeam Technologies"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                    <Building className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
                  </div>
                </div>
              </div>

              {/* Security & Password Update */}
              <div className="pt-4 border-t border-slate-100">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    {t('profile.securityPassword', 'Security & Password')}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('profile.passwordDesc', 'Leave blank if you do not want to change your password.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                      {t('profile.newPassword', 'New Password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                      {t('profile.confirmPassword', 'Confirm Password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 text-xs font-bold hover:bg-rose-100/80 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('profile.deleteAccount', 'Delete Profile')}
                </button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={handleReset}
                    disabled={!isDirty || loading}
                    className="rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {t('profile.discardChanges', 'Discard Changes')}
                  </Button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!isDirty || loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#075985] text-white font-bold text-sm shadow-md shadow-[#075985]/25 hover:bg-[#0369A1] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('profile.updating', 'Updating…')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {t('profile.saveChanges', 'Update Profile')}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Loyalty & Account Card */}
        <div className="space-y-6">
          
          {/* Loyalty Rewards Tier Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-['Plus_Jakarta_Sans'] text-[#0F172A]">{t('profile.loyaltyTier', 'Loyalty Rewards')}</h3>
                <span className="text-xs text-slate-500">Tier: {loyalty.tier}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t('profile.loyaltyDesc', 'Every event you attend unlocks progressive discounts on all future ticket reservations!')}
            </p>

            {/* Loyalty Levels visual roadmap */}
            <div className="space-y-2.5 pt-2">
              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${confirmedCount === 0 ? 'bg-white border-[#075985] ring-1 ring-[#075985]/30' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-800 block">Standard Patron</span>
                  <span className="text-[10px] text-slate-500">0 confirmed bookings</span>
                </div>
                <span className="font-mono font-bold text-slate-500">0%</span>
              </div>

              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${confirmedCount === 1 ? 'bg-white border-[#075985] ring-1 ring-[#075985]/30' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-800 block">Returning Patron</span>
                  <span className="text-[10px] text-slate-500">1 confirmed booking</span>
                </div>
                <span className="font-mono font-bold text-emerald-600">10% OFF</span>
              </div>

              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${confirmedCount >= 2 ? 'bg-white border-[#075985] ring-1 ring-[#075985]/30' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="font-bold text-slate-800 block flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    VIP Gold Patron
                  </span>
                  <span className="text-[10px] text-slate-500">2+ confirmed bookings</span>
                </div>
                <span className="font-mono font-bold text-[#075985]">20% OFF</span>
              </div>
            </div>
          </div>

          {/* Account Security & Role */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-['Plus_Jakarta_Sans'] text-[#0F172A]">{t('profile.accountSecurity', 'Account & Security')}</h3>
                <span className="text-xs text-slate-500">{t('profile.authRoles', 'Authentication & Roles')}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('profile.username', 'Username')}</span>
                <span className="font-mono font-bold text-slate-800">{currentUser?.username}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('profile.roleAuthority', 'Role Authority')}</span>
                <span className="font-bold text-[#5B44E8] bg-[#5B44E8]/10 px-2 py-0.5 rounded-md">{role}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('profile.staffPrivileges', 'Staff Privileges')}</span>
                <span className="font-medium text-slate-700">{currentUser?.is_staff ? 'Enabled' : 'Standard'}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('profile.paymentGateway', 'Payment Gateway')}</span>
                <span className="font-medium text-emerald-600">Razorpay (INR)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Delete Profile Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    {t('profile.deleteConfirmTitle', 'Delete Profile')}
                  </h3>
                  <p className="text-xs text-slate-500">{t('profile.cannotUndo', 'This action cannot be undone')}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {t('profile.deleteConfirmDesc', 'Are you sure you want to permanently delete your Eventrix account? All your booked tickets, loyalty rewards, and profile data will be permanently removed.')}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="rounded-xl cursor-pointer"
                >
                  {t('profile.cancel', 'Cancel')}
                </Button>
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('profile.deleting', 'Deleting…')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {t('profile.confirmDelete', 'Yes, Delete Profile')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
