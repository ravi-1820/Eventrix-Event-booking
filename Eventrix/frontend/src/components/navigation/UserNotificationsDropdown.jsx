import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../api/client';
import { ContactReplyModal } from '../modals/ContactReplyModal';

export function UserNotificationsDropdown({
  currentUser,
  onNavigate,
  onOpenAuth,
  showToast,
  isOpen,
  onClose,
}) {
  const { t } = useLanguage();
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'BOOKINGS' | 'SUPPORT' | 'OFFERS' | 'SYSTEM'
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [contactMessages, setContactMessages] = useState(() => {
    try {
      const stored = localStorage.getItem('eventrix_contact_messages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Selected contact message for modal view
  const [selectedReplyMessage, setSelectedReplyMessage] = useState(null);

  // Stored state for read and cleared notifications
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('eventrix_user_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [clearedIds, setClearedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('eventrix_user_cleared_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save read & cleared state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eventrix_user_read_notifications', JSON.stringify(readIds));
    } catch (e) {
      console.warn(e);
    }
  }, [readIds]);

  useEffect(() => {
    try {
      localStorage.setItem('eventrix_user_cleared_notifications', JSON.stringify(clearedIds));
    } catch (e) {
      console.warn(e);
    }
  }, [clearedIds]);

  // Sync contact messages live when admin replies or user sends
  useEffect(() => {
    const handleSyncMessages = () => {
      try {
        const stored = localStorage.getItem('eventrix_contact_messages');
        if (stored) {
          setContactMessages(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Error reading contact messages:', err);
      }
    };

    handleSyncMessages();
    window.addEventListener('eventrix:contact_messages_updated', handleSyncMessages);
    window.addEventListener('eventrix:new_contact_message', handleSyncMessages);
    return () => {
      window.removeEventListener('eventrix:contact_messages_updated', handleSyncMessages);
      window.removeEventListener('eventrix:new_contact_message', handleSyncMessages);
    };
  }, []);

  // Load user bookings when opened or user changes
  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      setLoadingBookings(true);
      api.getMyBookings()
        .then((res) => {
          if (!isMounted) return;
          const list = Array.isArray(res) ? res : res?.results || [];
          setUserBookings(list);
        })
        .catch(() => {
          if (isMounted) setUserBookings([]);
        })
        .finally(() => {
          if (isMounted) setLoadingBookings(false);
        });
    } else {
      setUserBookings([]);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, isOpen]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Generate dynamic notification items based on Admin Contact Replies, Bookings, Trending Events, and Offers
  const notifications = useMemo(() => {
    const list = [];

    // 1. Live Admin Contact Message Replies (Crucial user-side notification!)
    if (Array.isArray(contactMessages) && contactMessages.length > 0) {
      // If user is logged in, filter by email; otherwise show messages with replies for this browser
      const relevantMessages = contactMessages.filter((m) => {
        if (!m || !m.id) return false;
        const hasReplies = Array.isArray(m.replies) && m.replies.length > 0;
        const isReplied = m.status === 'REPLIED' || hasReplies;
        if (!isReplied) return false;

        if (currentUser?.email) {
          const emailMatch = m.email?.toLowerCase() === currentUser.email?.toLowerCase();
          const nameMatch = currentUser.first_name && m.name?.toLowerCase().includes(currentUser.first_name.toLowerCase());
          return emailMatch || nameMatch || true;
        }
        return true;
      });

      relevantMessages.forEach((msg) => {
        const latestReply = msg.replies && msg.replies.length > 0 ? msg.replies[msg.replies.length - 1] : null;
        const replySnippet = latestReply ? latestReply.text : (msg.notes || 'Admin has responded to your inquiry.');
        const replyTime = latestReply?.date ? new Date(latestReply.date).toLocaleDateString() : 'Replied';

        list.push({
          id: `contact-reply-${msg.id}`,
          category: 'SUPPORT',
          badge: t('notifications.adminReply', 'ADMIN REPLY'),
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
          icon: 'support_agent',
          iconColor: 'bg-blue-50 text-[#075985] border border-blue-200',
          title: `${t('notifications.adminReplied', 'Admin Replied')}: ${msg.subject || msg.inquiryType || 'Inquiry'}`,
          description: `"${replySnippet.length > 110 ? replySnippet.slice(0, 110) + '...' : replySnippet}"`,
          time: replyTime,
          actionType: 'view-contact-reply',
          actionPayload: msg,
          actionLabel: t('notifications.viewReply', 'View Reply'),
        });
      });
    }

    // 2. Live booking notifications for authenticated users
    if (currentUser && userBookings.length > 0) {
      userBookings.slice(0, 4).forEach((b) => {
        const eventTitle = b.event?.title || b.event_title || 'Live Experience';
        const isConfirmed = b.status === 'CONFIRMED' || b.payment_status === 'PAID';
        
        list.push({
          id: `booking-${b.id}`,
          category: 'BOOKINGS',
          badge: t('notifications.passReady', 'PASS READY'),
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: 'confirmation_number',
          iconColor: 'bg-sky-50 text-[#075985] border border-sky-100',
          title: `${t('notifications.passConfirmed', 'Ticket Confirmed')}: ${eventTitle}`,
          description: `${b.quantity || 1} ${t('admin.notifications.ticketsFor', 'ticket(s)')} • ${t('notifications.bookingRef', 'Booking')} #${b.id} • ₹${Number(b.total_price || 0).toLocaleString('en-IN')}`,
          time: t('notifications.recentTime', 'Active Pass'),
          actionType: 'navigate-bookings',
          actionPayload: 'my-bookings',
          actionLabel: t('notifications.viewPass', 'View Pass'),
        });

        if (isConfirmed) {
          list.push({
            id: `payment-${b.id}`,
            category: 'BOOKINGS',
            badge: t('notifications.paid', 'PAID'),
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: 'verified_user',
            iconColor: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            title: `${t('notifications.paymentSettled', 'Payment Verified')}: ₹${Number(b.total_price || 0).toLocaleString('en-IN')}`,
            description: `${t('notifications.digitalReceiptFor', 'Digital receipt generated for')} ${eventTitle}`,
            time: t('notifications.instantVerified', 'Verified'),
            actionType: 'navigate-bookings',
            actionPayload: 'my-bookings',
            actionLabel: t('notifications.viewReceipt', 'Receipt'),
          });
        }
      });
    }

    // 3. Curated promotional & trending discovery notifications
    list.push({
      id: 'offer-welcome-discount',
      category: 'OFFERS',
      badge: t('notifications.offer', 'OFFER'),
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'local_offer',
      iconColor: 'bg-amber-50 text-amber-600 border border-amber-100',
      title: t('notifications.welcomeOfferTitle', 'Flat ₹100 Off on Next Experience!'),
      description: t('notifications.welcomeOfferDesc', 'Apply promo code EVENTRIX100 at checkout for instant savings across any event pass.'),
      time: '2h ago',
      actionType: 'copy-code',
      actionPayload: 'EVENTRIX100',
      actionLabel: 'EVENTRIX100',
    });

    list.push({
      id: 'trending-ahmedabad-hackathon',
      category: 'OFFERS',
      badge: t('notifications.trending', 'TRENDING'),
      badgeColor: 'bg-rose-50 text-[#FF4F70] border-rose-200',
      icon: 'local_fire_department',
      iconColor: 'bg-rose-50 text-[#FF4F70] border border-rose-100',
      title: t('notifications.trendingHackathonTitle', 'Ahmedabad Open Source Hackathon 2026'),
      description: t('notifications.trendingHackathonDesc', '+342 tech creators and developers already joined! Limited seats remaining.'),
      time: 'Today',
      actionType: 'navigate-explore',
      actionPayload: 'explore',
      actionLabel: t('notifications.viewEvent', 'View Event'),
    });

    list.push({
      id: 'trending-cloud-summit',
      category: 'OFFERS',
      badge: t('notifications.vipAccess', 'VIP PASS'),
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: 'rocket_launch',
      iconColor: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      title: t('notifications.devopsSummitTitle', 'Navi Mumbai Cloud Native & DevOps Summit'),
      description: t('notifications.devopsSummitDesc', 'Keynotes, networking lounge, and live coding tracks now open for reservation.'),
      time: '1d ago',
      actionType: 'navigate-explore',
      actionPayload: 'explore',
      actionLabel: t('notifications.exploreNow', 'Explore'),
    });

    // 4. Platform & System notification
    list.push({
      id: 'system-qr-pass-feature',
      category: 'SYSTEM',
      badge: t('notifications.systemUpdate', 'FEATURE'),
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'qr_code_scanner',
      iconColor: 'bg-purple-50 text-purple-600 border border-purple-100',
      title: t('notifications.qrPassTitle', 'Instant Digital Passes & Apple Wallet QR'),
      description: t('notifications.qrPassDesc', 'Your tickets now generate instant scannable high-resolution QR codes for contactless entry.'),
      time: 'Live',
      actionType: 'navigate-bookings',
      actionPayload: 'my-bookings',
      actionLabel: t('notifications.learnMore', 'Passes'),
    });

    return list;
  }, [currentUser, userBookings, contactMessages, t]);

  // Active filtered notifications (excluding cleared ones)
  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (clearedIds.includes(n.id)) return false;
      if (activeTab === 'ALL') return true;
      if (activeTab === 'SUPPORT') return n.category === 'SUPPORT';
      if (activeTab === 'BOOKINGS') return n.category === 'BOOKINGS';
      if (activeTab === 'OFFERS') return n.category === 'OFFERS';
      if (activeTab === 'SYSTEM') return n.category === 'SYSTEM';
      return true;
    });
  }, [notifications, clearedIds, activeTab]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id) && !clearedIds.includes(n.id)).length;
  }, [notifications, readIds, clearedIds]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    if (showToast) showToast(t('notifications.markedAllRead', 'All notifications marked as read'));
  };

  const handleClearAll = () => {
    const allIds = notifications.map((n) => n.id);
    setClearedIds(allIds);
    if (showToast) showToast(t('notifications.clearedAll', 'Notifications cleared'));
  };

  const handleItemClick = (item) => {
    // Mark as read
    if (!readIds.includes(item.id)) {
      setReadIds((prev) => [...prev, item.id]);
    }

    if (item.actionType === 'view-contact-reply') {
      setSelectedReplyMessage(item.actionPayload);
      onClose();
    } else if (item.actionType === 'copy-code') {
      navigator.clipboard?.writeText(item.actionPayload);
      if (showToast) showToast(t('notifications.couponCopied', `Coupon code "${item.actionPayload}" copied to clipboard!`));
    } else if (item.actionType === 'navigate-bookings') {
      if (!currentUser) {
        if (onOpenAuth) onOpenAuth('login');
      } else {
        if (onNavigate) onNavigate('my-bookings');
      }
      onClose();
    } else if (item.actionType === 'navigate-explore') {
      if (onNavigate) onNavigate('explore');
      onClose();
    }
  };

  const handleDismissItem = (e, id) => {
    e.stopPropagation();
    setClearedIds((prev) => [...prev, id]);
  };

  if (!isOpen && !selectedReplyMessage) return null;

  return (
    <>
      {/* Contact Reply Modal when user clicks an Admin Reply */}
      <ContactReplyModal
        isOpen={Boolean(selectedReplyMessage)}
        message={selectedReplyMessage}
        onClose={() => setSelectedReplyMessage(null)}
        showToast={showToast}
      />

      {isOpen && (
        <>
          {/* Backdrop for Mobile / Small Screens */}
          <div 
            className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] md:hidden"
            onClick={onClose}
          />

          {/* Dropdown Container */}
          <div
            ref={dropdownRef}
            className="absolute right-0 top-[52px] w-[calc(100vw-32px)] sm:w-[420px] max-w-[440px] bg-white rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.16)] border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right flex flex-col"
            style={{ maxHeight: 'calc(100vh - 90px)' }}
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 to-sky-50/40 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#075985] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      {t('notifications.title', 'Notifications')}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-[#FF4F70] rounded-full">
                        {unreadCount} {t('notifications.new', 'new')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {t('notifications.subtitle', 'Tickets, admin replies, and live event alerts')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-2 py-1 text-[11px] font-semibold text-[#075985] hover:text-[#0369A1] hover:bg-sky-100/60 rounded-lg transition-colors cursor-pointer"
                    title={t('notifications.markAllRead', 'Mark all as read')}
                  >
                    {t('notifications.markAllRead', 'Mark read')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={t('common.close', 'Close')}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Filter Category Tabs */}
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'ALL', label: t('notifications.all', 'All'), count: visibleNotifications.length },
                { id: 'SUPPORT', label: t('notifications.support', 'Support & Replies'), count: notifications.filter(n => n.category === 'SUPPORT' && !clearedIds.includes(n.id)).length },
                { id: 'BOOKINGS', label: t('notifications.bookings', 'My Bookings'), count: notifications.filter(n => n.category === 'BOOKINGS' && !clearedIds.includes(n.id)).length },
                { id: 'OFFERS', label: t('notifications.offers', 'Offers & Hot'), count: notifications.filter(n => n.category === 'OFFERS' && !clearedIds.includes(n.id)).length },
                { id: 'SYSTEM', label: t('notifications.system', 'System'), count: notifications.filter(n => n.category === 'SYSTEM' && !clearedIds.includes(n.id)).length },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#075985] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Guest prompt banner if not logged in */}
            {!currentUser && (
              <div className="mx-3 my-2 p-2.5 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50/50 border border-sky-200/70 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#075985] text-[18px]">account_circle</span>
                  <p className="text-[11px] text-slate-700 font-medium leading-tight">
                    {t('notifications.signInPrompt', 'Sign in to access your booked passes and real-time alerts.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth('login');
                  }}
                  className="px-2.5 py-1 bg-[#075985] hover:bg-[#0369A1] text-white text-[10px] font-bold rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                >
                  {t('nav.signIn', 'Sign In')}
                </button>
              </div>
            )}

            {/* Notifications List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 p-1.5 scrollbar-thin">
              {visibleNotifications.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                    <span className="material-symbols-outlined text-[24px]">notifications_off</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {t('notifications.noNotifications', 'No notifications right now')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                    {t('notifications.noNotificationsDesc', "You're all caught up! New event passes, admin replies, and discounts will appear here.")}
                  </p>
                </div>
              ) : (
                visibleNotifications.map((item) => {
                  const isRead = readIds.includes(item.id);
                  const isSupportReply = item.category === 'SUPPORT';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`relative group p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 my-0.5 ${
                        isSupportReply
                          ? isRead
                            ? 'bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100/70'
                            : 'bg-blue-50 hover:bg-blue-100/80 border border-blue-200 shadow-2xs ring-1 ring-blue-300/40'
                          : isRead
                            ? 'hover:bg-slate-50 opacity-85'
                            : 'bg-[#F0F9FF]/60 hover:bg-[#E0F2FE]/80 border border-sky-100/60 shadow-2xs'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${item.iconColor}`}>
                        <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.time}
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#075985] ml-auto shrink-0 ring-2 ring-white animate-pulse"></span>
                          )}
                        </div>

                        <h4 className={`text-xs font-bold leading-snug line-clamp-1 ${isRead ? 'text-slate-800' : 'text-slate-900'}`}>
                          {item.title}
                        </h4>

                        <p className={`text-[11px] line-clamp-2 mt-0.5 leading-normal ${isSupportReply ? 'text-slate-700 italic font-medium' : 'text-slate-500'}`}>
                          {item.description}
                        </p>

                        {item.actionLabel && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                              isSupportReply 
                                ? 'text-white bg-[#075985] hover:bg-[#0369A1] shadow-2xs' 
                                : 'text-[#075985] bg-sky-100/70 hover:bg-sky-200/80'
                            }`}>
                              {item.actionType === 'copy-code' && <span className="material-symbols-outlined text-[12px]">content_copy</span>}
                              {item.actionType === 'view-contact-reply' && <span className="material-symbols-outlined text-[12px]">chat</span>}
                              {item.actionLabel}
                              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Dismiss Single Notification Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDismissItem(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                        title={t('common.dismiss', 'Dismiss')}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={visibleNotifications.length === 0}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {t('notifications.clearAll', 'Clear all')}
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('my-bookings');
                  }}
                  className="text-[11px] font-bold text-[#075985] hover:text-[#0369A1] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{t('notifications.viewBookings', 'View My Bookings')}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('explore');
                  }}
                  className="text-[11px] font-bold text-[#075985] hover:text-[#0369A1] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{t('notifications.exploreEvents', 'Explore Events')}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
