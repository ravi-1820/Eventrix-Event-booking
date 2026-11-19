import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { DashboardOverview } from './views/DashboardOverview';
import { AdminEventsView } from './views/AdminEventsView';
import { AdminBookingsView } from './views/AdminBookingsView';
import { AdminAttendeesView } from './views/AdminAttendeesView';
import { AdminAnalyticsView } from './views/AdminAnalyticsView';
import { AdminReviewsView } from './views/AdminReviewsView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { AdminPaymentsView } from './views/AdminPaymentsView';
import { AdminNotificationsView } from './views/AdminNotificationsView';
import { AdminUsersView } from './views/AdminUsersView';
import { AdminContactsView } from './views/AdminContactsView';
import { AdminRequirementsTracker } from './AdminRequirementsTracker';

import { EventDetailModal } from './EventDetailModal';
import { EditEventModal } from './EditEventModal';
import { CreateEventModal } from './CreateEventModal';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { api } from '../../api/client';

export function AdminLayout({
  currentUser,
  categories = [],
  showToast,
  onNavigate,
  onLogout
}) {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Dashboard dataset
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals & Detail Drawers
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);

  // Load Dashboard Data from backend
  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await api.getOrganizerDashboard();
      setDashData(data);
    } catch (err) {
      console.warn('Dashboard API error, loading safe state:', err);
      try {
        // Attempt to fetch public events as fallback data
        const publicEvents = await api.getEvents();
        const evList = publicEvents?.results || (Array.isArray(publicEvents) ? publicEvents : []);
        setDashData({
          stats: {
            total_events: evList.length,
            total_tickets_sold: 0,
            total_revenue: 0,
            total_capacity: evList.reduce((sum, e) => sum + (e.capacity || 0), 0),
            utilization_rate: 0,
            total_users: 0,
            total_payments: 0,
            total_bookings: 0
          },
          events: evList,
          bookings: [],
          payments: [],
          users: [],
          custom_requirements: []
        });
      } catch {
        setDashData({
          stats: {
            total_events: 0,
            total_tickets_sold: 0,
            total_revenue: 0,
            total_capacity: 0,
            utilization_rate: 0,
            total_users: 0,
            total_payments: 0,
            total_bookings: 0
          },
          events: [],
          bookings: [],
          payments: [],
          users: [],
          custom_requirements: []
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Unread contacts counter
  const [unreadContactsCount, setUnreadContactsCount] = useState(() => {
    try {
      const stored = localStorage.getItem('eventrix_contact_messages');
      if (stored) {
        const msgs = JSON.parse(stored);
        return Array.isArray(msgs) ? msgs.filter(m => m.status === 'NEW').length : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const updateUnread = () => {
      try {
        const stored = localStorage.getItem('eventrix_contact_messages');
        if (stored) {
          const msgs = JSON.parse(stored);
          if (Array.isArray(msgs)) {
            setUnreadContactsCount(msgs.filter(m => m.status === 'NEW').length);
          }
        }
      } catch {}
    };

    window.addEventListener('eventrix:new_contact_message', updateUnread);
    window.addEventListener('eventrix:contact_messages_updated', updateUnread);
    return () => {
      window.removeEventListener('eventrix:new_contact_message', updateUnread);
      window.removeEventListener('eventrix:contact_messages_updated', updateUnread);
    };
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Event actions
  const handleStatusChange = async (slug, newStatus) => {
    try {
      await api.updateEventStatus(slug, newStatus);
      if (showToast) showToast(`Event status updated to ${newStatus}`);
      setDashData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.slug === slug ? { ...e, status: newStatus } : e
        ),
      }));
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update event status');
    }
  };

  const handleDeleteEvent = async (slug) => {
    try {
      await api.deleteEvent(slug);
      if (showToast) showToast('Event deleted successfully.');
      setDashData((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.slug !== slug),
      }));
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete event');
    }
  };

  const handleToggleRequirement = async (reqId, notes) => {
    try {
      const updated = await api.toggleRequirement(reqId, notes);
      if (showToast) showToast(updated.is_fulfilled ? 'Marked as fulfilled!' : 'Marked as pending.');
      setDashData((prev) => ({
        ...prev,
        custom_requirements: prev.custom_requirements.map((r) =>
          r.id === reqId
            ? { ...r, is_fulfilled: updated.is_fulfilled, organizer_notes: updated.organizer_notes }
            : r
        ),
      }));
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update requirement');
    }
  };

  const handleBookingStatusChange = async (booking, newStatus) => {
    try {
      await api.adminUpdateBookingStatus(booking.booking_id, newStatus);
      if (showToast) showToast(`Booking ${booking.booking_id} status updated to ${newStatus}`);
      loadDashboard(true);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update booking status');
    }
  };

  const handleCreateSuccess = (newEvent) => {
    if (showToast) showToast(`"${newEvent.title}" created successfully!`);
    loadDashboard(true);
  };

  const handleEditSuccess = (updatedEvent) => {
    if (showToast) showToast(`"${updatedEvent.title}" updated successfully!`);
    setDashData((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.slug === updatedEvent.slug ? updatedEvent : e
      ),
    }));
  };

  // Navigate to public website
  const handleNavigateToPublic = () => {
    if (onNavigate) onNavigate('explore');
    else window.location.hash = '';
  };

  // Open Create Event Modal
  const handleOpenCreateEvent = () => {
    setIsCreateModalOpen(true);
  };

    // Dynamic live notifications generated from real dashboard telemetry
    const realNotifications = useMemo(() => {
      const list = [];
      const bookings = Array.isArray(dashData?.bookings) ? dashData.bookings : [];
      const payments = Array.isArray(dashData?.payments) ? dashData.payments : [];
      const requirements = Array.isArray(dashData?.custom_requirements) ? dashData.custom_requirements : [];

      // Real bookings
      bookings.slice(0, 5).forEach((b, idx) => {
        if (!b) return;
        list.push({
          id: `b-${b.id || idx}`,
          title: 'New Reservation Confirmed',
          desc: `${b.attendee_name || 'Attendee'} booked ${b.quantity || 1} seat(s) for "${b.event_title || 'Event'}"`,
          time: b.booked_at ? new Date(b.booked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          type: 'success'
        });
      });

      // Real payments
      payments.filter(p => p && p.status === 'SUCCEEDED').slice(0, 5).forEach((p, idx) => {
        list.push({
          id: `p-${p.id || idx}`,
          title: 'Payment Succeeded',
          desc: `Razorpay received ₹${Number(p.amount || 0).toLocaleString('en-IN')} for ${p.booking_id || p.transaction_id || 'Booking'}`,
          time: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          type: 'payment'
        });
      });

      // Real custom requirements
      requirements.filter(r => r && !r.is_fulfilled).slice(0, 3).forEach((r, idx) => {
        list.push({
          id: `r-${r.id || idx}`,
          title: 'Attendee Requirement Review',
          desc: `${r.participant_name || 'Participant'}: ${r.dietary_preference || r.seating_preference || 'Special request'}`,
          time: 'Pending',
          type: 'warning'
        });
      });

      return list;
    }, [dashData]);

  // Loading state skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {t('common.loading', 'Loading Eventrix Admin Suite...')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-slate-200/80 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Failed to Connect to Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const pendingReqCount = dashData?.custom_requirements?.filter(r => !r.is_fulfilled).length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex antialiased selection:bg-sky-500 selection:text-white">
      
      {/* 1. LEFT COLLAPSIBLE SIDEBAR */}
      <AdminSidebar
        activeView={activeView}
        onSelectView={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigateToPublic={handleNavigateToPublic}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        pendingRequirementsCount={pendingReqCount}
        unreadContactsCount={unreadContactsCount}
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        {/* TOP HEADER */}
        <AdminHeader
          activeView={activeView}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onCreateEvent={handleOpenCreateEvent}
          onRefresh={() => loadDashboard(true)}
          refreshing={refreshing}
          currentUser={currentUser}
          onLogout={onLogout}
          onNavigateToPublic={handleNavigateToPublic}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          notifications={realNotifications}
        />

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:px-10 w-full">
          {activeView === 'dashboard' && (
            <DashboardOverview
              dashData={dashData}
              currentUser={currentUser}
              onNavigateView={setActiveView}
              onSelectEvent={(event) => setSelectedEventDetail(event)}
              onEditEvent={(event) => setEditingEvent(event)}
              onViewBooking={(booking) => {
                setSelectedBookingDetail(booking);
                setBookingDrawerOpen(true);
              }}
            />
          )}

          {activeView === 'events' && (
            <AdminEventsView
              events={dashData?.events || []}
              categories={categories}
              onCreateEvent={handleOpenCreateEvent}
              onEditEvent={(event) => setEditingEvent(event)}
              onSelectEvent={(event) => setSelectedEventDetail(event)}
              onStatusChange={handleStatusChange}
              onDeleteEvent={handleDeleteEvent}
              showToast={showToast}
              onRefresh={() => loadDashboard(true)}
            />
          )}

          {activeView === 'bookings' && (
            <AdminBookingsView
              bookings={dashData?.bookings || []}
              events={dashData?.events || []}
              onBookingStatusChange={handleBookingStatusChange}
              showToast={showToast}
            />
          )}

          {activeView === 'users' && (
            <AdminUsersView showToast={showToast} />
          )}

          {activeView === 'attendees' && (

            <AdminAttendeesView
              bookings={dashData?.bookings || []}
              events={dashData?.events || []}
              showToast={showToast}
            />
          )}

          {activeView === 'payments' && (
            <AdminPaymentsView
              payments={dashData?.payments || []}
              onPaymentUpdated={() => loadDashboard(true)}
              showToast={showToast}
            />
          )}

          {activeView === 'notifications' && (
            <AdminNotificationsView
              dashData={dashData}
              onNavigateView={setActiveView}
            />
          )}

          {activeView === 'analytics' && (
            <AdminAnalyticsView dashData={dashData} />
          )}

          {activeView === 'requirements' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                  {t('admin.bcRequirementsTitle', 'Custom Attendee Requirements')}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('admin.bcRequirementsDesc', 'Fulfill dietary preferences, special seating, and VIP attendee requests')}
                </p>
              </div>
              <AdminRequirementsTracker
                requirements={dashData?.custom_requirements || []}
                onToggle={handleToggleRequirement}
              />
            </div>
          )}

          {activeView === 'contacts' && (
            <AdminContactsView showToast={showToast} />
          )}

          {activeView === 'reviews' && (
            <AdminReviewsView 
              events={dashData?.events || []} 
              bookings={dashData?.bookings || []}
              showToast={showToast}
            />
          )}

          {activeView === 'settings' && (
            <AdminSettingsView currentUser={currentUser} showToast={showToast} />
          )}
        </main>
      </div>

      {/* 3. MODALS & SLIDE-OVER DRAWERS */}
      <EventDetailModal
        event={selectedEventDetail}
        isOpen={Boolean(selectedEventDetail)}
        onClose={() => setSelectedEventDetail(null)}
        onEdit={(event) => setEditingEvent(event)}
        onDuplicate={(event) => {
          handleOpenCreateEvent();
        }}
        bookings={dashData?.bookings || []}
      />

      <EditEventModal
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        onSuccess={handleEditSuccess}
        categories={categories}
        event={editingEvent}
      />

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        categories={categories}
      />

      <BookingDetailDrawer
        booking={selectedBookingDetail}
        isOpen={bookingDrawerOpen}
        onClose={() => setBookingDrawerOpen(false)}
        onStatusChange={handleBookingStatusChange}
        showToast={showToast}
      />

    </div>
  );
}
