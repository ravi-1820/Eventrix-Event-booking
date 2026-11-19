import React, { useState, useEffect } from 'react';
import { 
  Compass, List, Sparkles, CheckCircle2, ShieldCheck, 
  Tag, Calendar, MapPin, Search 
} from 'lucide-react';
import { StitchHeader } from './components/navigation/StitchHeader';
import { StitchCategoryFilter } from './components/events/StitchCategoryFilter';
import { InteractiveMapCanvas } from './components/map/InteractiveMapCanvas';
import { StitchEventCard } from './components/events/StitchEventCard';
import { ExploreLocalEvents } from './components/events/ExploreLocalEvents';
import { MyBookingsPanel } from './components/bookings/MyBookingsPanel';
import { ProfilePanel } from './components/profile/ProfilePanel';
import { StitchFooter } from './components/navigation/StitchFooter';
import { StitchEventDetailModal } from './components/modals/StitchEventDetailModal';
import { StitchAuthModal } from './components/modals/StitchAuthModal';
import { AdminDashboardPanel } from './components/admin/AdminDashboardPanel';
import { AdminLayout } from './components/admin/AdminLayout';
import { AddEventPage } from './components/admin/AddEventPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { PaymentConfirmationPage } from './components/bookings/PaymentConfirmationPage';
import { PaymentMethodPage } from './components/bookings/PaymentMethodPage';
import { AboutPage } from './components/pages/AboutPage';
import { ContactPage } from './components/pages/ContactPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { api } from './api/client';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [lastConfirmedBooking, setLastConfirmedBooking] = useState(() => {
    try {
      const cached = sessionStorage.getItem('eventrix_confirmed_booking');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(() => {
    try {
      const cached = sessionStorage.getItem('eventrix_payment_pending_booking');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState(() => {
    if (window.location.hash === '#my-bookings') return 'my-bookings';
    if (window.location.hash === '#dashboard') return 'dashboard';
    if (window.location.hash === '#add-event' || window.location.hash === '#new-event') return 'add-event';
    if (window.location.hash === '#profile') return 'profile';
    if (window.location.hash === '#about') return 'about';
    if (window.location.hash === '#contact') return 'contact';
    if (window.location.hash === '#forgot-password') return 'forgot-password';
    if (window.location.hash === '#payment-method' || window.location.hash === '#payment-select') return 'payment-method';
    if (window.location.hash === '#payment-confirmation' || window.location.hash === '#payment-confirmed') return 'payment-confirmation';
    return 'explore';
  });
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

  const handleNavigate = (page, data = null) => {
    if (page === 'payment-method' && data) {
      setPendingPaymentBooking(data);
      try {
        sessionStorage.setItem('eventrix_payment_pending_booking', JSON.stringify(data));
      } catch (e) {}
    } else if (page === 'payment-confirmation' && data) {
      setLastConfirmedBooking(data);
      try {
        sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(data));
      } catch (e) {}
    }

    setCurrentPage(page);
    if (page === 'my-bookings') {
      window.location.hash = '#my-bookings';
    } else if (page === 'dashboard') {
      window.location.hash = '#dashboard';
    } else if (page === 'add-event') {
      window.location.hash = '#add-event';
    } else if (page === 'profile') {
      window.location.hash = '#profile';
    } else if (page === 'about') {
      window.location.hash = '#about';
    } else if (page === 'contact') {
      window.location.hash = '#contact';
    } else if (page === 'forgot-password') {
      window.location.hash = '#forgot-password';
    } else if (page === 'payment-method') {
      window.location.hash = '#payment-method';
    } else if (page === 'payment-confirmation' || page === 'payment-confirmed') {
      window.location.hash = '#payment-confirmation';
    } else {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      if (hash === '#my-bookings') {
        setCurrentPage('my-bookings');
      } else if (hash === '#dashboard') {
        setCurrentPage('dashboard');
      } else if (hash === '#add-event' || hash === '#new-event') {
        setCurrentPage('add-event');
      } else if (hash === '#profile') {
        setCurrentPage('profile');
      } else if (hash === '#about') {
        setCurrentPage('about');
      } else if (hash === '#contact') {
        setCurrentPage('contact');
      } else if (hash === '#forgot-password' || searchParams.get('auth') === 'forgot') {
        setCurrentPage('forgot-password');
      } else if (hash === '#payment-method' || hash === '#payment-select') {
        try {
          const cached = sessionStorage.getItem('eventrix_payment_pending_booking');
          if (cached) setPendingPaymentBooking(JSON.parse(cached));
        } catch (e) {}
        setCurrentPage('payment-method');
      } else if (hash === '#payment-confirmation' || hash === '#payment-confirmed') {
        try {
          const cached = sessionStorage.getItem('eventrix_confirmed_booking');
          if (cached) setLastConfirmedBooking(JSON.parse(cached));
        } catch (e) {}
        setCurrentPage('payment-confirmation');
      } else if (hash === '#login' || searchParams.get('auth') === 'login') {
        handleOpenAuth('login');
      } else if (hash === '#register' || searchParams.get('auth') === 'register') {
        handleOpenAuth('register');
      } else {
        setCurrentPage('explore');
      }
    };

    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Data state
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [loading, setLoading] = useState(true);

  // Selected event & Modal triggers
  const [selectedEventOnMap, setSelectedEventOnMap] = useState(null);
  const [detailModalEvent, setDetailModalEvent] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [toastMessage, setToastMessage] = useState('');

  const handleOpenAuth = (mode = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    // Initial user load
    const user = api.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      api.getProfile().then((profile) => {
        if (!profile) {
          setCurrentUser(null);
        } else {
          setCurrentUser(profile);
        }
      }).catch(() => {
        setCurrentUser(null);
      });
    }
    loadCategories();
    loadEvents();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedCategory, searchQuery, selectedCity]);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data.results || data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      if (selectedCity && selectedCity !== 'All Cities') params.city = selectedCity;

      const data = await api.getEvents(params);
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventOnMap(data[0]);
      } else {
        setSelectedEventOnMap(null);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (event) => {
    setSelectedEventOnMap(null);
    setDetailModalEvent(event);
  };

  const handleBookingSuccess = async (bookingData) => {
    if (bookingData) {
      setLastConfirmedBooking(bookingData);
      try {
        sessionStorage.setItem('eventrix_confirmed_booking', JSON.stringify(bookingData));
      } catch (e) {}
    }
    if (currentUser) {
      try {
        const updated = await api.getProfile();
        setCurrentUser(updated);
      } catch (e) {}
    }
    loadEvents();
    setDetailModalEvent(null);
    handleNavigate('payment-confirmation');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showToast('Signed out successfully.');
    handleNavigate('explore');
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setSelectedDateFilter('all');
    setSelectedCity('All Cities');
    setViewMode('map');
    handleNavigate('explore');
  };

  // Dedicated Full-Screen Enterprise Admin Dashboard
  if (currentPage === 'dashboard') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased">
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#0F172A] text-white text-xs shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}
          <AdminLayout
            currentUser={currentUser}
            categories={categories}
            showToast={showToast}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#E0F2FE] text-[#0F172A] font-sans antialiased selection:bg-[#FF4F70] selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#0F172A] text-white text-xs shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Brand Header */}
      <StitchHeader
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        onResetFilters={handleResetFilters}
        showToast={showToast}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        activePage={currentPage}
        setActivePage={handleNavigate}
      />

      {/* Main Container */}
      <main className="flex-grow w-full pt-[74px]">
        {currentPage === 'payment-confirmation' ? (
          <PaymentConfirmationPage
            bookingData={lastConfirmedBooking}
            onNavigate={handleNavigate}
          />
        ) : currentPage === 'payment-method' ? (
          <PaymentMethodPage
            bookingData={pendingPaymentBooking}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        ) : currentPage === 'about' ? (
          <div className="animate-in fade-in duration-200">
            <AboutPage onNavigate={handleNavigate} />
          </div>
        ) : currentPage === 'contact' ? (
          <div className="animate-in fade-in duration-200">
            <ContactPage onNavigate={handleNavigate} showToast={showToast} />
          </div>
        ) : currentPage === 'forgot-password' ? (
          <ForgotPasswordPage
            onNavigateHome={() => handleNavigate('explore')}
            onOpenLogin={() => handleOpenAuth('login')}
          />
        ) : currentPage === 'my-bookings' ? (
          <MyBookingsPanel
            currentUser={currentUser}
            onOpenAuth={handleOpenAuth}
            onOpenDetails={handleOpenDetails}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        ) : currentPage === 'dashboard' ? (
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-8 animate-in fade-in duration-200 pt-4">
            <AdminDashboardPanel
              currentUser={currentUser}
              categories={categories}
              showToast={showToast}
              onNavigate={handleNavigate}
            />
          </div>
        ) : currentPage === 'add-event' ? (
          <AddEventPage
            currentUser={currentUser}
            categories={categories}
            onNavigate={handleNavigate}
            onSuccess={(newEvent) => {
              loadEvents();
              handleNavigate('dashboard');
            }}
            showToast={showToast}
          />
        ) : currentPage === 'profile' ? (
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-8 animate-in fade-in duration-200 pt-4">
            <ProfilePanel
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onNavigate={handleNavigate}
              showToast={showToast}
            />
          </div>
        ) : (
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-8 animate-in fade-in duration-200">
            <ExploreLocalEvents 
              events={events}
              currentUser={currentUser}
              onOpenDetails={handleOpenDetails}
              onNavigate={handleNavigate}
              viewMode={viewMode}
              setViewMode={setViewMode}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedDateFilter={selectedDateFilter}
              onSelectDateFilter={setSelectedDateFilter}
              selectedEventOnMap={selectedEventOnMap}
              onSelectEventOnMap={(ev) => setSelectedEventOnMap(ev)}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
            />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <StitchFooter onNavigate={handleNavigate} />

      {/* Modals */}
      <StitchEventDetailModal
        isOpen={!!detailModalEvent}
        onClose={() => setDetailModalEvent(null)}
        event={detailModalEvent}
        currentUser={currentUser}
        onOpenAuth={() => handleOpenAuth('login')}
        onBookingSuccess={handleBookingSuccess}
        onNavigate={handleNavigate}
      />


      <StitchAuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome, ${user.first_name || user.username}!`);
        }}
      />
    </div>
  );
}
