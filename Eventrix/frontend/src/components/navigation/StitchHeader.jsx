import React, { useState, useEffect } from 'react';
import { EventrixLogo } from '../common/EventrixLogo';
import { LanguageSelector } from './LanguageSelector';
import { UserNotificationsDropdown } from './UserNotificationsDropdown';
import { useLanguage } from '../../context/LanguageContext';

export function StitchHeader({
  currentUser,
  onOpenAuth,
  onLogout,
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity,
  onResetFilters,
  currentPage = 'explore',
  onNavigate,
  activePage,
  setActivePage,
  viewMode,
  setViewMode,
  showToast,
}) {
  const { t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Synchronize unread count dynamically (including admin contact replies)
  useEffect(() => {
    const updateUnread = () => {
      try {
        const read = JSON.parse(localStorage.getItem('eventrix_user_read_notifications') || '[]');
        const cleared = JSON.parse(localStorage.getItem('eventrix_user_cleared_notifications') || '[]');
        const contactMsgs = JSON.parse(localStorage.getItem('eventrix_contact_messages') || '[]');
        
        let count = 0;
        const baseIds = ['offer-welcome-discount', 'trending-ahmedabad-hackathon', 'trending-cloud-summit', 'system-qr-pass-feature'];
        baseIds.forEach((id) => {
          if (!read.includes(id) && !cleared.includes(id)) count++;
        });

        contactMsgs.forEach((m) => {
          if (m && (m.status === 'REPLIED' || (m.replies && m.replies.length > 0))) {
            const replyId = `contact-reply-${m.id}`;
            if (!read.includes(replyId) && !cleared.includes(replyId)) {
              count++;
            }
          }
        });

        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    };

    updateUnread();
    window.addEventListener('eventrix:contact_messages_updated', updateUnread);
    window.addEventListener('eventrix:new_contact_message', updateUnread);
    return () => {
      window.removeEventListener('eventrix:contact_messages_updated', updateUnread);
      window.removeEventListener('eventrix:new_contact_message', updateUnread);
    };
  }, [showNotifications]);

  const page = activePage || currentPage || 'explore';
  const isAdmin = Boolean(
    currentUser?.profile?.role === 'ORGANIZER' ||
    currentUser?.profile?.role === 'ADMIN' ||
    currentUser?.is_staff ||
    currentUser?.is_superuser
  );

  const navigate = (p) => {
    if (onNavigate) onNavigate(p);
    if (setActivePage) setActivePage(p);
    setShowMobileMenu(false);
    setShowUserMenu(false);
  };

  const handleExploreClick = () => {
    navigate('explore');
    if (onResetFilters) onResetFilters();
  };

  const handleMyBookingClick = () => {
    navigate('my-bookings');
  };

  const handleDashboardClick = () => {
    navigate('dashboard');
  };

  const handleAboutClick = () => {
    navigate('about');
  };

  const handleContactClick = () => {
    navigate('contact');
  };

  const handleProfileClick = () => {
    navigate('profile');
  };

  const navLinks = [
    { id: 'explore', label: t('nav.home', 'Home'), onClick: handleExploreClick },
    { id: 'about', label: t('nav.about', 'About'), onClick: handleAboutClick },
    { id: 'contact', label: t('nav.contact', 'Contact'), onClick: handleContactClick },
    ...(!isAdmin ? [{ id: 'my-bookings', label: t('nav.myBooking', 'My Booking'), onClick: handleMyBookingClick }] : []),
    ...(isAdmin ? [{ id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), onClick: handleDashboardClick }] : []),
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[74px] bg-white/92 backdrop-blur-md border-b border-slate-200/75 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all">
      {/* 3-ZONE FULL-WIDTH NAVBAR CONTAINER */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ========================================================
            ZONE 1: LEFT AREA (Logo & Subtitle)
            shrink-0 takes natural width without taking artificial flex space
            ======================================================== */}
        <div className="flex items-center justify-start shrink-0">
          <a
            onClick={handleExploreClick}
            className="flex items-center group cursor-pointer select-none py-1"
            data-path="explore"
            title="Eventrix - Events Management System"
          >
            <EventrixLogo size="md" variant="header" />
          </a>
        </div>

        {/* ========================================================
            ZONE 2: CENTER AREA (Premium Search Bar)
            flex-1 min-w-0 expands in the middle with safe horizontal padding
            so it can NEVER collide or overlap with Home or Logo
            ======================================================== */}
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-3 lg:px-6 xl:px-8">
          <div className="relative flex items-center w-full max-w-[360px] lg:max-w-[460px] xl:max-w-[560px] 2xl:max-w-[660px] h-[46px] bg-white rounded-[14px] border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05)] focus-within:border-[#075985] focus-within:ring-2 focus-within:ring-[#075985]/15 focus-within:shadow-[0_2px_8px_rgba(7,89,133,0.08)] transition-all duration-150">
            <span className="material-symbols-outlined text-slate-400 text-[20px] ml-3.5 mr-2.5 shrink-0 select-none">
              search
            </span>
            <input 
              type="text"
              className="w-full h-full bg-transparent border-0 outline-none text-[13px] font-normal text-slate-900 placeholder:text-slate-400 pr-3 min-w-0" 
              placeholder={t('nav.searchPlaceholder', 'Search events, venues...')} 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 mr-2.5 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title={t('nav.clearSearch', 'Clear search')}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            ZONE 3: RIGHT AREA (Navigation Links, Language, Notifications, Sign In / Avatar)
            shrink-0 guarantees nav links and user buttons are never squeezed
            ======================================================== */}
        <div className="flex items-center justify-end shrink-0 gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3">
          
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink-0 whitespace-nowrap mr-0.5">
            {navLinks.map((link) => {
              const isActive = page === link.id || (link.id === 'dashboard' && page === 'add-event');
              return (
                <button 
                  key={link.id}
                  onClick={link.onClick} 
                  className={`whitespace-nowrap shrink-0 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer select-none ${
                    isActive 
                      ? 'text-[#075985] bg-[#E0F2FE]/75 font-semibold shadow-2xs' 
                      : 'text-slate-700 hover:text-[#075985] hover:bg-[#F0F9FF] font-medium'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Compact Premium Language Selector [ 🌐 EN ▾ ] */}
          <LanguageSelector />

          {/* Mobile Search Toggle Icon */}
          <button
            type="button"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Toggle search"
            className="md:hidden relative w-[42px] h-[42px] rounded-xl flex items-center justify-center text-slate-600 hover:text-[#075985] hover:bg-[#F0F9FF] border border-slate-200/60 hover:border-slate-300 transition-all duration-150 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px] select-none">
              {showMobileSearch ? 'close' : 'search'}
            </span>
          </button>

          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              aria-label={t('nav.notifications', 'Notifications')} 
              title={t('nav.notifications', 'Notifications')}
              aria-expanded={showNotifications}
              className={`relative w-[42px] h-[42px] rounded-xl flex items-center justify-center border transition-all duration-150 cursor-pointer shrink-0 select-none ${
                showNotifications
                  ? 'bg-[#E0F2FE] text-[#075985] border-sky-300 shadow-2xs'
                  : 'text-slate-600 hover:text-[#075985] hover:bg-[#F0F9FF] border-slate-200/60 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] select-none">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4F70] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4F70] ring-2 ring-white"></span>
                </span>
              )}
            </button>

            {/* User Notifications Dropdown */}
            <UserNotificationsDropdown
              currentUser={currentUser}
              onNavigate={navigate}
              onOpenAuth={onOpenAuth}
              showToast={showToast}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* User Profile or Sign In CTA */}
          {currentUser ? (
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-[42px] px-2.5 sm:px-3 rounded-xl flex items-center gap-2 hover:bg-slate-100/80 border border-slate-200/70 hover:border-slate-300 transition-all duration-150 cursor-pointer shrink-0"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#075985] to-[#0284C7] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {currentUser.first_name ? currentUser.first_name[0].toUpperCase() : currentUser.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[110px] truncate">
                  {currentUser.first_name || currentUser.username}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-base">expand_more</span>
              </button>
              
              {/* User Dropdown Backdrop */}
              {showUserMenu && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
              )}

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div 
                    onClick={() => {
                      setShowUserMenu(false);
                      handleProfileClick();
                    }}
                    className="px-3 py-2.5 border-b border-slate-100 mb-1.5 cursor-pointer hover:bg-[#F0F9FF] rounded-xl transition-colors"
                    title={t('nav.myProfile', 'Manage Profile')}
                  >
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.first_name} {currentUser.last_name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    {currentUser.profile?.role && (
                      <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E0F2FE] text-[#075985] border border-[#BAE6FD]">
                        {currentUser.profile.role}
                      </span>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleProfileClick();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-[#075985]">person</span>
                    {t('nav.myProfile', 'My Profile')}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => { setShowUserMenu(false); handleDashboardClick(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-[#075985]">dashboard</span>
                      {t('nav.organizerDashboard', 'Organizer Dashboard')}
                    </button>
                  )}
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        handleMyBookingClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-[#075985]">confirmation_number</span>
                      {t('nav.myBooking', 'My Booking')}
                    </button>
                  )}
                  
                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#FF4F70] hover:bg-[#FF4F70]/10 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    {t('nav.signOut', 'Sign Out')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="h-[42px] px-5 rounded-xl bg-[#075985] hover:bg-[#0369A1] active:bg-[#0c4a6e] text-white text-[13px] font-semibold tracking-normal shadow-[0_1px_2px_rgba(7,89,133,0.18)] hover:shadow-[0_2px_6px_rgba(7,89,133,0.24)] transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
            >
              {t('nav.signIn', 'Sign In')}
            </button>
          )}

          {/* Mobile Navigation Menu Toggle */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle navigation menu"
            className="lg:hidden relative w-[42px] h-[42px] rounded-xl flex items-center justify-center text-slate-600 hover:text-[#075985] hover:bg-[#F0F9FF] border border-slate-200/60 hover:border-slate-300 transition-all duration-150 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px] select-none">
              {showMobileMenu ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MOBILE COLLAPSIBLE SEARCH BAR (below header)
          ======================================================== */}
      {showMobileSearch && (
        <div className="md:hidden w-full bg-white/98 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex items-center w-full h-[42px] bg-slate-50 rounded-xl border border-slate-200/90 focus-within:border-[#075985] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#075985]/15 transition-all">
            <span className="material-symbols-outlined text-slate-400 text-[18px] ml-3 mr-2 shrink-0">
              search
            </span>
            <input 
              type="text"
              autoFocus
              className="w-full h-full bg-transparent border-0 outline-none text-xs font-normal text-slate-900 placeholder:text-slate-400 pr-3" 
              placeholder={t('nav.searchPlaceholder', 'Search events, venues...')} 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 mr-2 p-1 rounded-md hover:bg-slate-100 transition-colors"
                title={t('nav.clearSearch', 'Clear search')}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE NAVIGATION DROPDOWN MENU
          ======================================================== */}
      {showMobileMenu && (
        <div className="lg:hidden absolute top-[74px] inset-x-0 bg-white/98 backdrop-blur-md border-b border-slate-200/80 shadow-xl px-4 py-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-1 w-full">
            {navLinks.map((link) => {
              const isActive = page === link.id || (link.id === 'dashboard' && page === 'add-event');
              return (
                <button
                  key={link.id}
                  onClick={link.onClick}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#075985] bg-[#E0F2FE]'
                      : 'text-slate-700 hover:text-[#075985] hover:bg-[#F0F9FF]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            {/* Mobile Language Switcher */}
            <div className="pt-2 mt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1.5">
                {t('nav.language', 'Language')}
              </span>
              <LanguageSelector variant="mobile-inline" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
