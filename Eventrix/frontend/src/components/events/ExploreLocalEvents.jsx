import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, Sparkles, ShieldCheck, Ticket, Users, 
  MapPin, Award, ArrowRight, CheckCircle2, Star,
  MessageSquare, ThumbsUp, BadgeCheck, Quote
} from 'lucide-react';
import { StitchEventCard } from './StitchEventCard';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StitchCategoryFilter } from './StitchCategoryFilter';
import { InteractiveMapCanvas } from '../map/InteractiveMapCanvas';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { getStoredReviews, saveReviews } from '../../lib/reviewsStorage';

export function ExploreLocalEvents({ 
  events: rawEvents = [], 
  currentUser, 
  onOpenDetails,
  onNavigate,
  viewMode,
  setViewMode,
  categories,
  selectedCategory,
  onSelectCategory,
  selectedDateFilter,
  onSelectDateFilter,
  selectedEventOnMap,
  onSelectEventOnMap,
  selectedCity = 'All Cities',
  onSelectCity,
}) {
  const { t, translateEvent, translateCity } = useLanguage();
  const [heroIndex, setHeroIndex] = useState(0);

  // Live Attendee Reviews state
  const [reviewsList, setReviewsList] = useState(() => getStoredReviews());

  useEffect(() => {
    const handleSync = () => {
      setReviewsList(getStoredReviews());
    };
    window.addEventListener('eventrix:reviews_updated', handleSync);
    window.addEventListener('eventrix:new_review', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('eventrix:reviews_updated', handleSync);
      window.removeEventListener('eventrix:new_review', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const publishedReviews = useMemo(() => {
    return (reviewsList || []).filter(r => r && r.status === 'PUBLISHED');
  }, [reviewsList]);

  // Handle helpful upvote on home page
  const handleHelpfulUpvote = (reviewId, e) => {
    e?.stopPropagation();
    const updated = reviewsList.map(r => {
      if (r.id === reviewId) {
        return { ...r, helpful: (r.helpful || 0) + 1 };
      }
      return r;
    });
    setReviewsList(updated);
    saveReviews(updated);
  };

  // Translate all incoming events into the active language
  const events = useMemo(() => {
    return (rawEvents || []).map(ev => translateEvent(ev));
  }, [rawEvents, translateEvent]);

  // Extract events for hero layout
  let carouselEvents = [];
  let spotlightEvents = [];
  let remainingEvents = [];

  if (events && events.length > 0) {
    const featured = events.filter(e => e.featured);
    const nonFeatured = events.filter(e => !e.featured);

    if (featured.length >= 3) {
      // Use top 3 featured for carousel
      carouselEvents = featured.slice(0, 3);
      // Next 2 for spotlights if available, otherwise fallback
      spotlightEvents = featured.length >= 5 ? [featured[3], featured[4]] : [featured[0], featured[1]];
      remainingEvents = nonFeatured;
    } else if (events.length >= 3) {
      carouselEvents = events.slice(0, 3);
      spotlightEvents = events.length >= 5 ? [events[3], events[4]] : [events[0], events[1]];
      remainingEvents = events.slice(3);
    } else {
      carouselEvents = events.slice(0, 1);
      spotlightEvents = events.slice(1);
      remainingEvents = [];
    }
  }

  useEffect(() => {
    if (carouselEvents.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % carouselEvents.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselEvents.length]);

  const heroEvent = carouselEvents[heroIndex] || null;

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-visible">
        {/* Discovery Header & Date Selector Strip */}
        <section className="pb-3 sticky top-[74px] z-40 bg-[#E0F2FE]/95 backdrop-blur-md border-b border-[#BAE6FD]/50 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 px-4 sm:px-6 lg:px-8 xl:px-12 pt-2 transition-all">
          <StitchCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            selectedDateFilter={selectedDateFilter}
            onSelectDateFilter={onSelectDateFilter}
            totalEventsCount={events.length}
          />
        </section>

        {/* Hero Spotlight Section (Split Card Showcase) */}
        <section className="pb-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
            {/* Main Feature Banner Carousel */}
            <div className="lg:col-span-8 relative rounded-3xl overflow-hidden shadow-lg bg-slate-950 flex flex-col justify-between min-h-[420px] md:min-h-[460px]">
              <AnimatePresence>
                {heroEvent && (
                  <motion.div
                    key={heroEvent.id || heroIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 flex flex-col justify-between group cursor-pointer"
                    onClick={() => onOpenDetails(heroEvent)}
                  >
                    <div className="absolute inset-0 z-0">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                        alt={heroEvent.title}
                        src={heroEvent.banner_url || "https://images.unsplash.com/photo-1540039155732-68473678c227?auto=format&fit=crop&q=80&w=1200"} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';
                        }}
                      />
                      {/* Crisp photo-first bottom vignette for text legibility - completely clear image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 p-4 md:p-6 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#FF4F70] text-white font-bold text-xs shadow-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">local_fire_department</span> {t('hero.trendingNow', 'Trending Now')}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 font-bold text-xs shadow-xs">
                          {t('hero.featured', 'Featured')}
                        </span>
                      </div>
                      <button aria-label="Bookmark headline event" className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-[#FF4F70] flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0" }}>favorite_border</span>
                      </button>
                    </div>
                    
                    <div className="relative z-10 p-5 md:p-8 flex flex-col gap-4 text-white">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <span className="material-symbols-outlined text-base text-[#FF4F70]">calendar_today</span>
                        <span>{formatDate(heroEvent.start_date || new Date())}</span>
                        <span className="opacity-60">•</span>
                        <span className="material-symbols-outlined text-base text-[#FF4F70]">pin_drop</span>
                        <span>{heroEvent.venue_name || t('hero.secretLocation', 'Secret Location')}</span>
                      </div>
                      
                      <div className="max-w-2xl">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2 drop-shadow-sm">
                          {heroEvent.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                          {heroEvent.description || "Join us for an unforgettable experience that will leave you breathless and wanting more. Limited tickets available."}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/15">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">{t('hero.startingPrice', 'Starting Price')}</span>
                            <span className="text-xl sm:text-2xl font-black font-mono text-white leading-tight">
                              {parseFloat(heroEvent.ticket_price) === 0 ? t('card.free', 'FREE') : formatCurrency(heroEvent.ticket_price || 0)}
                            </span>
                          </div>
                          
                          {/* Local Crowd Avatar Stack */}
                          <div className="flex items-center pl-4 border-l border-white/20">
                            <div className="flex -space-x-2 overflow-hidden">
                              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Attendee 1" />
                              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="Attendee 2" />
                              <img className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Attendee 3" />
                            </div>
                            <span className="ml-2 text-xs font-semibold text-slate-200">{t('hero.localsGoing', '+342 locals going')}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button 
                            className="flex-1 sm:flex-initial h-11 px-6 rounded-full bg-gradient-to-r from-[#FF4F70] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white font-extrabold text-xs shadow-lg shadow-[#FF4F70]/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); onOpenDetails(heroEvent); }}
                          >
                            <span>{t('hero.bookInstantTickets', 'Book Instant Tickets')}</span>
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Carousel Indicators */}
              {carouselEvents.length > 1 && (
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">
                  {carouselEvents.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setHeroIndex(idx); }}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${heroIndex === idx ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Spotlight Secondary Previews */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {spotlightEvents.map((event, idx) => (
                <div 
                  key={event.id || idx} 
                  className="relative flex-1 bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between group overflow-hidden cursor-pointer" 
                  onClick={() => onOpenDetails(event)}
                >
                  {/* Top Image Banner */}
                  <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden relative shadow-xs bg-slate-100 shrink-0">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={event.banner_url || `https://images.unsplash.com/photo-${idx % 2 === 0 ? '1470229722913-7c090be5c52c' : '1514525253161-7a46d19cd819'}?auto=format&fit=crop&q=80&w=600`}
                      alt={event.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Category Tag on top-left of image */}
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                      {event.category_details?.name || t('hero.featured', 'Spotlight')}
                    </span>
                    
                    {/* Price Tag on bottom-right of image */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-md font-mono text-[11px] text-[#075985] font-extrabold shadow-xs">
                      {parseFloat(event.ticket_price) === 0 ? t('card.free', 'FREE') : formatCurrency(event.ticket_price || 0)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1 mt-2.5 flex-1 justify-center">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#075985] transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                      <span className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-sm text-[#075985]">location_on</span> 
                        <span className="truncate">{event.venue_name || (event.city ? `${event.city}` : "Ahmedabad")}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[#075985] shrink-0 text-[11px]">
                        <span className="material-symbols-outlined text-xs">calendar_today</span> 
                        {formatDate(event.start_date || new Date()).split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="material-symbols-outlined text-sm fill-current">star</span>
                      <span className="text-xs font-bold text-slate-800">4.9</span>
                      <span className="text-[10px] text-slate-400 font-medium">({t('hero.verified', 'Verified')})</span>
                    </div>
                    <button 
                      className="px-4 py-1.5 rounded-full bg-[#075985] hover:bg-[#0369A1] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95" 
                      onClick={(e) => { e.stopPropagation(); onOpenDetails(event); }}
                    >
                      <span>{t('hero.claimPass', 'Claim Pass')}</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TOGGLEABLE BOTTOM HALF ── */}
        {viewMode === 'map' ? (
          <section className="pb-space-xl animate-in fade-in duration-300">
            <InteractiveMapCanvas
              events={events}
              selectedEvent={selectedEventOnMap}
              onSelectEvent={onSelectEventOnMap}
              onOpenDetails={onOpenDetails}
              selectedCity={selectedCity}
              onSelectCity={onSelectCity}
            />
          </section>
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* Main Weekend Event Cards Grid (6 Detailed Discoveries) */}
        {remainingEvents.length > 0 && (
          <section className="pb-space-xl">
            <div className="flex items-center justify-between mb-space-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{t('hero.weekendHighlights', 'Weekend Highlights Around Town')}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t('hero.weekendHighlightsDesc', 'Handpicked sessions, underground gigs, and weekend market showcases')}</p>
              </div>
              <button 
                onClick={() => setViewMode('map')} 
                className="font-label-md text-label-md text-[#075985] flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-0"
              >
                <span>{t('hero.viewFullMap', 'View full map')}</span>
                <span className="material-symbols-outlined text-base">map</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {remainingEvents.map((ev) => (
                <StitchEventCard
                  key={ev.id}
                  event={ev}
                  currentUser={currentUser}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
            
            <div className="mt-space-xl text-center">
              <button className="px-space-xl py-space-md rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer" type="button">
                <span>{t('hero.showMoreEvents', 'Show More Weekend Events')}</span>
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
            </div>
          </section>
        )}

        {/* Curated 48-Hour Weekend Itineraries (Static Design Element) */}
        <section className="pb-space-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-space-md gap-space-xs">
            <div>
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">{t('itinerary.tag', 'Zero-Effort Planning')}</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">{t('itinerary.title', 'Curated 48-Hour Weekend Itineraries')}</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              {t('itinerary.subtitle', 'Seamless multi-stop guides hand-stitched by local tastemakers for effortless weekend pacing.')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Itinerary 1 */}
            <div className="relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-md hover:shadow-xl transition-all group flex flex-col justify-between p-space-lg">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#075985]/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <span className="px-space-sm py-1 rounded-full bg-[#E0F2FE] text-[#075985] font-label-sm text-label-sm font-bold">{t('itinerary.ahmedabadTag', 'Food & Heritage Crawl')}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> 6 {t('itinerary.stops', 'Stops')}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">{t('itinerary.ahmedabadTrail', 'Old Ahmedabad Heritage & Street Food Trail')}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{t('itinerary.ahmedabadDesc', 'From morning maska bun and chai at heritage pols to sunset riverfront walks and late-night food stalls at Manek Chowk.')}</p>
                <div className="mt-space-md space-y-2">
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-primary">1</span><span>{t('itinerary.ahmedabadStop1', 'Manek Chowk Heritage Walk (11 AM)')}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-primary">2</span><span>{t('itinerary.ahmedabadStop2', 'Chai Wai & Art Cafe')}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-primary">3</span><span>{t('itinerary.ahmedabadStop3', 'Sabarmati Riverfront Promenade (9 PM)')}</span></div>
                </div>
              </div>
              <div className="pt-space-md mt-space-md border-t border-surface-container-low flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface">{t('itinerary.ahmedabadPrice', 'Est. ₹1,200–₹1,800 / person')}</span>
                <button className="font-label-md text-label-md text-[#075985] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold cursor-pointer">{t('itinerary.viewGuide', 'View Guide')} <span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>

            {/* Itinerary 2 */}
            <div className="relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-md hover:shadow-xl transition-all group flex flex-col justify-between p-space-lg">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <span className="px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">{t('itinerary.bandraTag', 'Chill Sunday Reset')}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> 4 {t('itinerary.stops', 'Stops')}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors">{t('itinerary.bandraTrail', 'Bandra Cultural & Sunset Promenade')}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{t('itinerary.bandraDesc', 'Gentle morning stroll, artisan specialty coffee house, seaside heritage trail, and live acoustic sunset sessions.')}</p>
                <div className="mt-space-md space-y-2">
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-secondary">1</span><span>{t('itinerary.bandraStop1', "Jogger's Park morning walk")}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-secondary">2</span><span>{t('itinerary.bandraStop2', 'Subko Coffee & Bakehouse')}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-secondary">3</span><span>{t('itinerary.bandraStop3', 'Bandstand Cultural Promenade')}</span></div>
                </div>
              </div>
              <div className="pt-space-md mt-space-md border-t border-surface-container-low flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface">{t('itinerary.bandraPrice', 'Est. ₹600 / person')}</span>
                <button className="font-label-md text-label-md text-[#075985] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold cursor-pointer">{t('itinerary.viewGuide', 'View Guide')} <span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>

            {/* Itinerary 3 */}
            <div className="relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-md hover:shadow-xl transition-all group flex flex-col justify-between p-space-lg">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-tertiary-fixed/30 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <span className="px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-bold">{t('itinerary.koramangalaTag', 'Arts & Music Crawl')}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> 5 {t('itinerary.stops', 'Stops')}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-tertiary transition-colors">{t('itinerary.koramangalaTrail', 'Koramangala Indie & Night Live Showcase')}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{t('itinerary.koramangalaDesc', 'Boutique indie book cafes, immersive craft studios, and subterranean live jazz & indie music cellars.')}</p>
                <div className="mt-space-md space-y-2">
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-tertiary">1</span><span>{t('itinerary.koramangalaStop1', '100ft Road Arts Pavilion (6 PM)')}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-tertiary">2</span><span>{t('itinerary.koramangalaStop2', 'Church Street cultural walk')}</span></div>
                  <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface"><span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm font-bold text-tertiary">3</span><span>{t('itinerary.koramangalaStop3', 'Live indie acoustic session')}</span></div>
                </div>
              </div>
              <div className="pt-space-md mt-space-md border-t border-surface-container-low flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface">{t('itinerary.koramangalaPrice', 'Est. ₹1,500 / person')}</span>
                <button className="font-label-md text-label-md text-[#075985] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold cursor-pointer">{t('itinerary.viewGuide', 'View Guide')} <span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>
          </div>
        </section>

        {/* Neighborhood Map Callout Section */}
        <section className="pb-space-xl">
          <div className="bg-gradient-to-br from-inverse-surface to-on-background rounded-3xl p-space-lg md:p-space-xl text-background relative overflow-hidden shadow-2xl">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
              <div className="lg:col-span-6 flex flex-col gap-space-sm">
                <div className="inline-flex items-center gap-space-xs text-primary-fixed">
                  <span className="material-symbols-outlined">explore</span>
                  <span className="font-label-md text-label-md uppercase tracking-wider font-bold">{t('map.liveHeatmap', 'India Live Heatmap')}</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg md:text-display-hero text-surface-container-lowest leading-tight">
                  {t('map.buzzingBlock', "See what's buzzing block by block")}
                </h2>
                <p className="font-body-md text-body-md text-surface-variant max-w-md">
                  {t('map.blockBuzzSubtitle', 'Filter by crowd density, live music decibels, or food truck lineups across SG Highway, Sindhu Bhavan, Navrangpura, and Riverfront.')}
                </p>
                <div className="flex flex-wrap gap-space-xs mt-space-xs">
                  <span className="px-space-md py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-background font-label-md text-label-md">📍 SG Highway (38 Events)</span>
                  <span className="px-space-md py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-background font-label-md text-label-md">📍 Sindhu Bhavan (29 Events)</span>
                  <span className="px-space-md py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-background font-label-md text-label-md">📍 Riverfront (44 Events)</span>
                </div>
                <div className="pt-space-md">
                  <button 
                    onClick={() => setViewMode('map')}
                    className="h-12 px-space-xl rounded-full bg-[#075985] hover:bg-[#0369A1] text-white font-label-lg text-label-lg transition-transform active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer" 
                    type="button"
                  >
                    <span className="material-symbols-outlined">location_searching</span>
                    <span>{t('map.openMap', 'Open Interactive Map')}</span>
                  </button>
                </div>
              </div>
              
              <div className="lg:col-span-6 mt-8 lg:mt-0">
                <div className="relative w-full h-72 md:h-80 rounded-2xl overflow-hidden shadow-lg border-0 bg-surface-container">
                  <div className="absolute inset-0 bg-secondary/10 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2 bg-on-background/80 backdrop-blur-md p-space-md rounded-2xl shadow-2xl text-center">
                      <span className="material-symbols-outlined text-[#075985] text-3xl animate-bounce">place</span>
                      <span className="font-headline-sm text-headline-sm text-surface-container-lowest font-bold">
                        {events.length} {selectedCity && selectedCity !== 'All Cities' ? translateCity(selectedCity) : t('filter.allCities', 'Indian')} {t('map.eventsPinned', 'Events Pinned')}
                      </span>
                      <span className="font-body-sm text-body-sm text-surface-variant">{t('map.tapRadar', 'Tap to switch to live GPS map radar')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
          </div>
        )}

        {/* ── VERIFIED ATTENDEE REVIEWS & TESTIMONIALS (Live Community Pulse) ── */}
        <section className="pt-12 pb-10 mt-6 border-t border-slate-200/80">
          <div className="w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-bold mb-2">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{t('homeReviews.badge', 'Verified Community Ratings & Feedback')}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                  {t('homeReviews.title', 'Loved by Real Attendees Across India')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                  {t('homeReviews.subtitle', 'Explore honest reviews and verified feedback from attendees who booked passes on Eventrix.')}
                </p>
              </div>

              {/* Quick Overall Stat Chip */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
                <div className="flex items-center gap-1 bg-amber-50 text-amber-800 font-extrabold px-2.5 py-1.5 rounded-xl text-sm border border-amber-200/60">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>4.9 / 5.0</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {publishedReviews.length} {t('homeReviews.verifiedReviews', 'Verified Reviews')}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('homeReviews.realAttendees', '100% Real Ticket Holders')}
                  </span>
                </div>
              </div>
            </div>

            {/* Reviews Cards Grid */}
            {publishedReviews.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center shadow-xs">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No reviews published yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Book your pass, attend an event, and submit your review from the My Bookings section!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {publishedReviews.slice(0, 6).map((rev) => {
                  const matchedEvent = rawEvents.find(
                    e => String(e.id) === String(rev.eventId) || e.slug === rev.eventId || e.title === rev.event_title
                  );
                  return (
                    <motion.div
                      key={rev.id}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-[#BAE6FD] shadow-sm hover:shadow-xl hover:shadow-[#075985]/8 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Rating Stars & Date */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Number(rev.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-slate-100 text-slate-200'
                                }`}
                              />
                            ))}
                            <span className="text-xs font-black text-slate-800 ml-1.5 font-mono">
                              {Number(rev.rating).toFixed(1)}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {rev.date || 'Recent'}
                          </span>
                        </div>

                        {/* Review Content */}
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium mb-4 italic line-clamp-4">
                          "{rev.comment}"
                        </p>

                        {/* Associated Event Tag */}
                        {rev.event_title && (
                          <div className="mb-4">
                            <button
                              onClick={() => {
                                if (matchedEvent && onOpenDetails) {
                                  onOpenDetails(matchedEvent);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all truncate max-w-full ${
                                matchedEvent
                                  ? 'bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#075985] cursor-pointer'
                                  : 'bg-slate-100 text-slate-600 cursor-default'
                              }`}
                              title={matchedEvent ? 'Click to view event details' : rev.event_title}
                            >
                              <Ticket className="w-3 h-3 shrink-0" />
                              <span className="truncate">{rev.event_title}</span>
                              {matchedEvent && <ArrowRight className="w-2.5 h-2.5 shrink-0" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Author Info & Helpful Button */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#075985] to-[#0284C7] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {(rev.author || 'A')[0].toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-extrabold text-slate-900 truncate">
                                {rev.author || 'Verified Attendee'}
                              </span>
                              <BadgeCheck className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 block truncate">
                              Verified Pass Holder
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleHelpfulUpvote(rev.id, e)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] font-bold border border-slate-200/80 transition-all active:scale-95 cursor-pointer shrink-0"
                          title="Helpful review"
                        >
                          <ThumbsUp className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          <span>{rev.helpful || 0}</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── IMPORTANT ABOUT EVENTRIX HIGHLIGHTS (Home Page Showcase) ── */}
        <section className="pt-16 pb-12 mt-8 border-t border-slate-100">
          <div className="w-full">
            {/* Top Tag & Title */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#075985]" />
                <span>{t('aboutSection.tag', "About Eventrix · India's Live Social Pulse")}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight leading-snug font-['Plus_Jakarta_Sans',sans-serif]">
                {t('aboutSection.title', 'Transforming how you discover & experience')} <span className="text-[#075985]">{t('aboutSection.titleHighlight', 'live culture.')}</span>
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                {t('aboutSection.desc', 'Eventrix is built for spontaneous weekend lovers, tech pioneers, and cultural explorers. From acoustic terrace sessions to tech conclaves and night festivals across 15+ Indian cities, we ensure seamless discovery and verified entry every time.')}
              </p>
            </div>

            {/* 4 Essential Social Proof Numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: t('aboutSection.eventsHosted', 'Live Events Hosted'), value: '1,500+', icon: Compass, color: '#075985' },
                { label: t('aboutSection.happyAttendees', 'Happy Attendees'), value: '85,000+', icon: Users, color: '#075985' },
                { label: t('aboutSection.citiesConnected', 'Cities Connected'), value: '15+', icon: MapPin, color: '#075985' },
                { label: t('aboutSection.bookingRating', 'Booking Rating'), value: '99.4%', icon: Award, color: '#10B981' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={stat.label}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col items-center text-center hover:border-slate-300 transition-all"
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-slate-100 text-[#075985]"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-mono text-[#0F172A] tracking-tight">
                      {stat.value}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 3 Core Trust Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#075985] flex items-center justify-center mb-3">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{t('aboutSection.gpsDiscovery', 'Real-Time GPS Discovery')}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {t('aboutSection.gpsDiscoveryDesc', 'Explore concerts and pop-ups block-by-block with live crowd heatmaps and interactive neighborhood routing.')}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#075985] flex items-center justify-center mb-3">
                  <Ticket className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{t('aboutSection.qrPasses', 'Instant QR Digital Passes')}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {t('aboutSection.qrPassesDesc', 'Sub-second checkout with UPI, Card, or Wallet. Digital passes sync directly to your offline wallet.')}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#10B981] flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{t('aboutSection.guaranteedEntry', 'Guaranteed Entry & Refunds')}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {t('aboutSection.guaranteedEntryDesc', '100% verified organizer partners with instant cancellations and transparent refund protection.')}
                </p>
              </div>
            </div>

            {/* Bottom Navigation Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('about');
                  else window.location.hash = '#about';
                }}
                className="px-5 py-2.5 rounded-full bg-[#075985] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{t('aboutSection.readStory', 'Read Full Story & Team')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (onNavigate) onNavigate('contact');
                  else window.location.hash = '#contact';
                }}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{t('aboutSection.contactUs', 'Have a Question? Contact Us')}</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
