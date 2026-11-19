import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Bell, RefreshCw, ExternalLink, 
  User, LogOut, CheckCircle2, AlertCircle, ChevronDown,
  Sparkles, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../navigation/LanguageSelector';

export function AdminHeader({
  activeView,
  onOpenMobileSidebar,
  onRefresh,
  refreshing,
  currentUser,
  onLogout,
  onNavigateToPublic,
  globalSearch,
  setGlobalSearch,
  notifications = []
}) {
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return { title: t('admin.bcDashboardTitle', 'Dashboard'), desc: t('admin.bcDashboardDesc', 'Overview of your event platform and revenue performance') };
      case 'events': return { title: t('admin.bcEventsTitle', 'Events Management'), desc: t('admin.bcEventsDesc', 'Create, monitor and manage all hosted experiences') };
      case 'bookings': return { title: t('admin.bcBookingsTitle', 'Bookings & Reservations'), desc: t('admin.bcBookingsDesc', 'Track attendee orders, tickets, and reservations') };
      case 'users': return { title: t('admin.bcUsersTitle', 'User Management'), desc: t('admin.bcUsersDesc', 'Manage user accounts, roles, profiles, and booking history') };
      case 'attendees': return { title: t('admin.bcAttendeesTitle', 'Attendee Directory'), desc: t('admin.bcAttendeesDesc', 'View attendees, verify check-ins, and export guest lists') };
      case 'payments': return { title: t('admin.bcPaymentsTitle', 'Payments & Transactions'), desc: t('admin.bcPaymentsDesc', 'Monitor Razorpay collections, payouts, and process refunds') };
      case 'analytics': return { title: t('admin.bcAnalyticsTitle', 'Platform Analytics'), desc: t('admin.bcAnalyticsDesc', 'Deep dive into revenue velocity, bookings, and city growth') };
      case 'requirements': return { title: t('admin.bcRequirementsTitle', 'Custom Requirements'), desc: t('admin.bcRequirementsDesc', 'Special attendee requests, VIP seating, and dietary notes') };
      case 'contacts': return { title: t('admin.bcContactsTitle', 'Contact & Inquiries Hub'), desc: t('admin.bcContactsDesc', 'Manage user messages, community advice, feedback, and support inquiries') };
      case 'reviews': return { title: t('admin.bcReviewsTitle', 'Reviews & Feedback'), desc: t('admin.bcReviewsDesc', 'Attendee sentiment, event ratings, and post-event feedback') };
      case 'notifications': return { title: t('admin.bcNotificationsTitle', 'System Notifications'), desc: t('admin.bcNotificationsDesc', 'Platform alerts, payment webhooks, and attendee updates') };
      case 'settings': return { title: t('admin.bcSettingsTitle', 'Admin Settings'), desc: t('admin.bcSettingsDesc', 'Platform configuration, currency, and integration settings') };
      default: return { title: t('admin.bcDefaultTitle', 'Admin Control Center'), desc: t('admin.bcDefaultDesc', 'Eventrix enterprise management system') };
    }
  };

  const { title, desc } = getBreadcrumbTitle();

  const activeNotifications = notifications;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 lg:px-8 py-3.5 transition-all shadow-xs">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                {title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('admin.suiteBadge', 'Eventrix Suite')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden md:block mt-0.5 font-medium">
              {desc}
            </p>
          </div>
        </div>

        {/* Right: Actions, Language Selector, Notifications, & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Language Selector Dropdown */}
          <div className="relative">
            <LanguageSelector />
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title={t('admin.refresh', 'Refresh')}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-sky-600' : ''} />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
              title={t('admin.notifications', 'Notifications')}
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-900">{t('admin.notifications', 'Notifications')}</span>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-full">
                    {activeNotifications.length} {t('common.viewAll', 'Total')}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {activeNotifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">
                      {t('admin.notifications.noNotifications', 'No pending notifications')}
                    </div>
                  ) : (
                    activeNotifications.map((notif) => (
                      <div key={notif.id} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{notif.desc}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5" />

          {/* User Profile Pill Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                {currentUser?.first_name ? currentUser.first_name[0].toUpperCase() : currentUser?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden xl:block text-left leading-none">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.first_name || currentUser?.username}
                </p>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  {currentUser?.profile?.role || 'Admin'}
                </span>
              </div>
              <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : currentUser?.username}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigateToPublic();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} className="text-slate-400" />
                  <span>{t('admin.publicWebsite', 'Public Event Website')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut size={14} className="text-rose-500" />
                  <span>{t('admin.signOut', 'Sign Out')}</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}

