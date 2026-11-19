import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import L from 'leaflet';
import { 
  MapPin, Plus, Minus,
  Star, ChevronDown, ChevronRight, X, ArrowRight, Sparkles, ZoomIn,
  Sun, Moon, Maximize2, Minimize2, Compass, Globe, Calendar, Ticket, Flame
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

// Helper to extract stylish Ticket-Pass date typography
const getEventDateParts = (dateStr) => {
  if (!dateStr) return { month: 'SEP', day: '28', weekday: 'MON', time: '7:00 PM' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: 'SEP', day: '28', weekday: 'MON', time: '7:00 PM' };
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
};

// ── Supported Indian Cities & Configurations ──────────────────────────────────
export const SUPPORTED_CITIES = [
  'All Cities',
  'Ahmedabad',
  'Baroda',
  'Surat',
  'Gansoli',
  'Udaipur',
  'Mumbai',
  'Bengaluru',
  'Delhi NCR',
  'Pune',
  'Hyderabad',
  'Vadodara',
  'Jaipur',
  'Rajkot',
  'Gandhinagar',
  'Chennai',
];

export const CITY_MAP_CONFIG = {
  'All Cities': {
    name: 'India',
    center: [21.8, 79.0],
    zoom: 5,
    minZoom: 4,
    bounds: [[8.0, 68.0], [35.5, 97.0]],
    label: 'India Live Map',
  },
  'Ahmedabad': {
    name: 'Ahmedabad',
    center: [23.0300, 72.5400],
    zoom: 12,
    bounds: [[22.95, 72.44], [23.12, 72.66]],
    label: 'Ahmedabad Live Map',
  },
  'Baroda': {
    name: 'Baroda',
    center: [22.3072, 73.1812],
    zoom: 13,
    bounds: [[22.23, 73.10], [22.38, 73.28]],
    label: 'Baroda Live Map',
  },
  'Surat': {
    name: 'Surat',
    center: [21.1702, 72.8311],
    zoom: 12,
    bounds: [[21.08, 72.72], [21.26, 72.92]],
    label: 'Surat Live Map',
  },
  'Gansoli': {
    name: 'Gansoli',
    center: [19.1235, 73.0034],
    zoom: 13,
    bounds: [[19.08, 72.96], [19.17, 73.05]],
    label: 'Gansoli Live Map',
  },
  'Udaipur': {
    name: 'Udaipur',
    center: [24.5854, 73.7125],
    zoom: 13,
    bounds: [[24.52, 73.65], [24.65, 73.78]],
    label: 'Udaipur Live Map',
  },
  'Gandhinagar': {
    name: 'Gandhinagar',
    center: [23.2156, 72.6369],
    zoom: 13,
    bounds: [[23.15, 72.55], [23.28, 72.72]],
    label: 'Gandhinagar Live Map',
  },
  'Mumbai': {
    name: 'Mumbai',
    center: [19.0900, 72.8650],
    zoom: 11,
    bounds: [[18.89, 72.75], [19.28, 73.02]],
    label: 'Mumbai Live Map',
  },
  'Bengaluru': {
    name: 'Bengaluru',
    center: [12.9716, 77.6200],
    zoom: 12,
    bounds: [[12.83, 77.48], [13.12, 77.75]],
    label: 'Bengaluru Live Map',
  },
  'Delhi NCR': {
    name: 'Delhi NCR',
    center: [28.6139, 77.2090],
    zoom: 11,
    bounds: [[28.38, 76.90], [28.88, 77.48]],
    label: 'Delhi NCR Live Map',
  },
  'Pune': {
    name: 'Pune',
    center: [18.5204, 73.8567],
    zoom: 12,
    bounds: [[18.42, 73.74], [18.62, 73.98]],
    label: 'Pune Live Map',
  },
  'Hyderabad': {
    name: 'Hyderabad',
    center: [17.4350, 78.4200],
    zoom: 12,
    bounds: [[17.25, 78.30], [17.55, 78.62]],
    label: 'Hyderabad Live Map',
  },
  'Vadodara': {
    name: 'Vadodara',
    center: [22.3072, 73.1812],
    zoom: 13,
    bounds: [[22.23, 73.10], [22.38, 73.28]],
    label: 'Vadodara Live Map',
  },
  'Jaipur': {
    name: 'Jaipur',
    center: [26.9124, 75.7873],
    zoom: 12,
    bounds: [[26.80, 75.68], [27.02, 75.92]],
    label: 'Jaipur Live Map',
  },
  'Rajkot': {
    name: 'Rajkot',
    center: [22.3039, 70.8022],
    zoom: 13,
    bounds: [[22.22, 70.72], [22.38, 70.88]],
    label: 'Rajkot Live Map',
  },
  'Chennai': {
    name: 'Chennai',
    center: [13.0600, 80.2400],
    zoom: 12,
    bounds: [[12.92, 80.12], [13.22, 80.35]],
    label: 'Chennai Live Map',
  },
};

// ── Map Provider & Basemap Configuration ──────────────────────────────────────
// Reads public API key from Vite environment (VITE_CARTO_API_KEY / VITE_MAP_API_KEY)
export const MAP_API_KEY = (
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_CARTO_API_KEY || import.meta.env.VITE_MAP_API_KEY || '')
    : ''
).trim();

export function getTileConfiguration(theme) {
  const isDark = theme === 'dark';

  if (MAP_API_KEY) {
    return {
      url: isDark
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(MAP_API_KEY)}`
        : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(MAP_API_KEY)}`,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      isDarkFilterNeeded: false,
    };
  }

  // Watermark-free public basemap (OpenStreetMap) to prevent "API KEY REQUIRED" overlay
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    isDarkFilterNeeded: isDark,
  };
}

// ── Known Indian Venue Coordinates Fallback ───────────────────────────────────
export const KNOWN_VENUE_COORDINATES = {
  // Gandhinagar
  'mahatma mandir': [23.208500, 72.641600],
  'gift city': [23.161000, 72.684000],
  // Mumbai
  'jio world': [19.060700, 72.868300],
  'bkc': [19.060700, 72.868300],
  'nesco': [19.155100, 72.855000],
  'goregaon': [19.155100, 72.855000],
  'bandra': [19.054400, 72.840200],
  'prithvi': [19.106200, 72.825800],
  'marine drive': [18.943200, 72.823000],
  // Bengaluru
  'koramangala': [12.935200, 77.624500],
  'ub city': [12.971900, 77.595800],
  'leela palace': [12.960600, 77.648400],
  'whitefield': [12.969800, 77.750000],
  'indiranagar': [12.978400, 77.640800],
  // Ahmedabad
  'sabarmati riverfront': [23.028900, 72.576200],
  'sindhu bhavan': [23.045200, 72.508500],
  'devx': [23.045200, 72.508500],
  'vastrapur': [23.036000, 72.529000],
  'navrangpura': [23.036800, 72.560400],
  // Pune
  'jw marriott': [18.531200, 73.829800],
  'senapati bapat': [18.531200, 73.829800],
  'koregaon park': [18.536200, 73.894000],
  'baner': [18.559000, 73.786800],
  // Delhi NCR
  'india habitat centre': [28.589800, 77.224900],
  'lodhi road': [28.589800, 77.224900],
  'connaught place': [28.630400, 77.217700],
  'cyber hub': [28.495000, 77.089500],
  // Surat
  'siecc': [21.144800, 72.766300],
  'sarsana': [21.144800, 72.766300],
  'dumas': [21.077500, 72.710000],
  // Vadodara
  'sir sayajirao nagargruh': [22.298600, 73.166800],
  'akota': [22.298600, 73.166800],
  'alkapuri': [22.310700, 73.171200],
  // Jaipur
  'birla auditorium': [26.906900, 75.806400],
  'statue circle': [26.906900, 75.806400],
  'c-scheme': [26.906900, 75.806400],
  // Rajkot
  'pramukh swami': [22.283500, 70.768100],
  'kalawad road': [22.283500, 70.768100],
  // Hyderabad
  'hitex': [17.472800, 78.373500],
  'hitec city': [17.447400, 78.376200],
  // Chennai
  'chennai trade centre': [13.013400, 80.183700],
  'nandambakkam': [13.013400, 80.183700],
};

export function getEventCoordinates(event) {
  if (event.latitude && event.longitude) {
    const lat = parseFloat(event.latitude);
    const lng = parseFloat(event.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
  }

  const searchStr = `${event.venue_name || ''} ${event.location_or_link || ''} ${event.title || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_VENUE_COORDINATES)) {
    if (searchStr.includes(key)) {
      return coords;
    }
  }

  const cityConfig = CITY_MAP_CONFIG[event.city];
  if (cityConfig) {
    const hash = (event.id || 1) * 0.003;
    return [cityConfig.center[0] + (hash % 0.01 - 0.005), cityConfig.center[1] + (hash % 0.01 - 0.005)];
  }

  return [23.0225, 72.5714];
}

const SORT_OPTIONS = ['Relevance', 'Price: Low to High', 'Price: High to Low', 'Date', 'Rating'];

function getPinColor(event) {
  const cat = (event.category_details?.name || '').toLowerCase();
  if (cat.includes('music') || cat.includes('concert')) return '#6366f1';
  if (cat.includes('food')  || cat.includes('market'))  return '#f59e0b';
  if (cat.includes('comedy')|| cat.includes('theatre')) return '#f43f5e';
  if (cat.includes('wellness')||cat.includes('yoga'))   return '#10b981';
  if (cat.includes('art')   || cat.includes('gallery')) return '#ec4899';
  return '#6366f1';
}

function getPinEmoji(event) {
  const cat = (event.category_details?.name || '').toLowerCase();
  if (cat.includes('music') || cat.includes('concert')) return '🎵';
  if (cat.includes('food')  || cat.includes('market'))  return '🍜';
  if (cat.includes('comedy'))                           return '🎤';
  if (cat.includes('wellness')||cat.includes('yoga'))   return '🧘';
  if (cat.includes('art'))                              return '🎨';
  return '✨';
}

const LEGEND = [
  { color: '#6366f1', label: 'Music & Concerts' },
  { color: '#f59e0b', label: 'Food & Night Market' },
  { color: '#f43f5e', label: 'Comedy & Theatre' },
  { color: '#10b981', label: 'Wellness & Yoga' },
  { color: '#ec4899', label: 'Arts & Exhibitions' },
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600';

// ── Cluster Popover ───────────────────────────────────────────────────────────
function ClusterPopover({ cluster, onClose, onOpenDetails, onViewAllInFeed, onZoomToSeparate, popoverRef, reduceMotion, isDark }) {
  const { t, translateCity } = useLanguage();
  const springTransition = reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 };

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10 }}
      transition={springTransition}
      className={`absolute top-16 left-6 w-[360px] max-w-[calc(100vw-3rem)] ${
        isDark ? 'bg-slate-900/95 text-white border-slate-800' : 'bg-white/95 text-slate-900 border-slate-200/90'
      } backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden z-[500]`}
      role="dialog"
      aria-label={`${cluster.events.length} events at ${cluster.label}`}
    >
      <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div>
          <span className="text-[10px] font-bold text-[#075985] uppercase tracking-widest block">
            {cluster.city ? translateCity(cluster.city) : cluster.label}
          </span>
          <h4 className="text-sm font-extrabold font-['Plus_Jakarta_Sans'] leading-tight mt-0.5">
            {cluster.events.length} {t('filter.eventsFound', 'Events Available')}
          </h4>
        </div>
        <button
          onClick={onClose}
          aria-label="Close popover"
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ml-3 shrink-0 ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/10">
        {cluster.events.map((event) => {
          const price    = parseFloat(event.ticket_price) === 0 ? t('card.free', 'FREE') : formatCurrency(event.ticket_price);
          const pinColor = getPinColor(event);
          const catName  = event.category_details?.name || t('hero.featured', 'Event');

          return (
            <button
              key={event.id}
              onClick={() => {
                onClose();
                onOpenDetails(event);
              }}
              className={`group w-full flex items-center gap-3 px-4 py-3 cursor-pointer relative transition-colors text-left ${
                isDark ? 'hover:bg-slate-800/80' : 'hover:bg-[#E0F2FE]/50'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#075985] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
              
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative shadow-sm">
                <img
                  src={event.banner_url || FALLBACK_IMG}
                  alt={event.title}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white"
                  style={{ backgroundColor: pinColor }}
                />
              </div>

              <div className="flex-grow min-w-0">
                <h5 className="text-xs font-bold truncate group-hover:text-[#075985] transition-colors leading-snug">
                  {event.title}
                </h5>
                <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatDate(event.start_time || event.start_date)} • {catName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-500">4.9</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] text-xs font-bold font-mono">
                  {price}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      <div className={`px-4 py-3 border-t flex items-center gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          onClick={() => { onViewAllInFeed(cluster.events); onClose(); }}
          className="flex-grow flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#075985] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {t('map.viewAllInFeed', 'View All')} ({cluster.events.length})
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { onZoomToSeparate(cluster); onClose(); }}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Zoom into this area"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          {t('map.zoom', 'Zoom')}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Geographic Interactive Map Canvas ────────────────────────────────────
export function InteractiveMapCanvas({ 
  events: rawEvents = [], 
  selectedEvent, 
  onSelectEvent, 
  onOpenDetails, 
  selectedCity = 'All Cities',
  onSelectCity,
}) {
  const { t, translateEvent, translateCity } = useLanguage();
  const reduceMotion = useReducedMotion();

  // Translate all incoming events
  const events = useMemo(() => {
    return (rawEvents || []).map(ev => translateEvent(ev));
  }, [rawEvents, translateEvent]);

  // Leaflet map container & instance refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Map state
  const [mapTheme, setMapTheme] = useState('light');
  const [isExpanded, setIsExpanded] = useState(false);
  const [openCluster, setOpenCluster] = useState(null);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [sortBy, setSortBy] = useState('Relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeRingId, setActiveRingId] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const cardRefs = useRef({});
  const clusterPopoverRef = useRef(null);

  // Map configuration for current city
  const cityConfig = CITY_MAP_CONFIG[selectedCity] || CITY_MAP_CONFIG['All Cities'];

  // Geocode events and filter based on selectedCity
  const mappedEvents = useMemo(() => {
    return events.map((ev) => {
      const coords = getEventCoordinates(ev);
      return {
        ...ev,
        lat: coords[0],
        lng: coords[1],
      };
    });
  }, [events]);

  // Compute clusters:
  // In "All Cities" mode: Group by event.city
  // In Single City mode: Group nearby venues (distance < 0.015 deg)
  const { singles, clusters } = useMemo(() => {
    if (selectedCity === 'All Cities') {
      const cityGroups = {};
      mappedEvents.forEach((ev) => {
        const cityKey = ev.city || 'Other';
        if (!cityGroups[cityKey]) {
          const cfg = CITY_MAP_CONFIG[cityKey] || { center: [ev.lat, ev.lng] };
          cityGroups[cityKey] = {
            id: `city-${cityKey}`,
            city: cityKey,
            label: `${cityKey}`,
            lat: cfg.center[0],
            lng: cfg.center[1],
            events: [],
          };
        }
        cityGroups[cityKey].events.push(ev);
      });

      const s = [];
      const c = [];
      Object.values(cityGroups).forEach((grp) => {
        if (grp.events.length > 1) {
          c.push(grp);
        } else {
          s.push(grp.events[0]);
        }
      });
      return { singles: s, clusters: c };
    } else {
      // Single city mode: cluster venues within ~1.2 km (0.012 degrees)
      const venueGroups = {};
      mappedEvents.forEach((ev) => {
        // Round to ~1.2km precision for clustering
        const gridKey = `${Math.round(ev.lat * 80) / 80}_${Math.round(ev.lng * 80) / 80}`;
        if (!venueGroups[gridKey]) {
          venueGroups[gridKey] = {
            id: `venue-${gridKey}`,
            city: selectedCity,
            label: ev.venue_name || ev.city,
            lat: ev.lat,
            lng: ev.lng,
            events: [],
          };
        }
        venueGroups[gridKey].events.push(ev);
      });

      const s = [];
      const c = [];
      Object.values(venueGroups).forEach((grp) => {
        if (grp.events.length > 1) {
          c.push(grp);
        } else {
          s.push(grp.events[0]);
        }
      });
      return { singles: s, clusters: c };
    }
  }, [mappedEvents, selectedCity]);

  // Synchronize tile layer and dark mode CSS filter
  const updateTileLayer = useCallback((theme) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileCfg = getTileConfiguration(theme);
    const newTiles = L.tileLayer(tileCfg.url, {
      maxZoom: 19,
      subdomains: tileCfg.subdomains || 'abc',
      attribution: tileCfg.attribution,
    }).addTo(map);

    tileLayerRef.current = newTiles;

    if (mapContainerRef.current) {
      if (tileCfg.isDarkFilterNeeded) {
        mapContainerRef.current.classList.add('eventrix-dark-tiles');
      } else {
        mapContainerRef.current.classList.remove('eventrix-dark-tiles');
      }
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialConfig = CITY_MAP_CONFIG[selectedCity] || CITY_MAP_CONFIG['All Cities'];

    const map = L.map(mapContainerRef.current, {
      center: initialConfig.center,
      zoom: initialConfig.zoom,
      zoomControl: false, // We use custom HUD zoom buttons
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    updateTileLayer(mapTheme);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [updateTileLayer]); // Run once on mount

  // Update Tile Layer on Theme Change
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateTileLayer(mapTheme);
    }
  }, [mapTheme, updateTileLayer]);

  // Fly / Re-center Map whenever selectedCity or mappedEvents changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setOpenCluster(null);

    const config = CITY_MAP_CONFIG[selectedCity] || CITY_MAP_CONFIG['All Cities'];
    
    // In "All Cities", fit tightly to active event markers
    if (selectedCity === 'All Cities' && mappedEvents.length > 0) {
      const bounds = L.latLngBounds(mappedEvents.map(e => [e.lat, e.lng]));
      map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 6.5, duration: 1.2 });
    } else {
      map.flyTo(config.center, config.zoom, { duration: 1.2 });
    }
  }, [selectedCity, mappedEvents]);

  // Ensure Leaflet recalculates viewport on resize/expanded toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isExpanded, selectedCity]);

  // Render Leaflet Markers & Clusters
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Render Cluster Badges
    clusters.forEach((cluster) => {
      const isSelected = openCluster?.id === cluster.id;
      const count = cluster.events.length;

      const clusterHtml = `
        <div class="cursor-pointer relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white font-black text-xs border-2 border-white dark:border-slate-900 shadow-xl bg-gradient-to-r from-[#075985] to-[#FF4F70] whitespace-nowrap active:scale-95 transition-transform">
          <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>${cluster.label} (+${count})</span>
        </div>
      `;

      const clusterIcon = L.divIcon({
        html: clusterHtml,
        className: 'eventrix-cluster-icon',
        iconSize: [140, 36],
        iconAnchor: [70, 18],
      });

      const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon }).addTo(markersLayer);

      marker.on('click', () => {
        if (selectedCity === 'All Cities' && onSelectCity) {
          // Clicking a city cluster in All Cities mode selects that city
          onSelectCity(cluster.city);
        } else {
          setOpenCluster(cluster);
        }
      });
    });

    // 2. Render Individual Event Pins
    singles.forEach((event) => {
      const isSelected = selectedEvent?.id === event.id;
      const isHovered = hoveredEvent?.id === event.id;
      const isActive = isSelected || isHovered;
      const pinColor = getPinColor(event);
      const emoji = getPinEmoji(event);
      const price = parseFloat(event.ticket_price) === 0 ? 'FREE' : formatCurrency(event.ticket_price);

      const activeGlow = isActive
        ? `box-shadow: 0 0 0 6px ${pinColor}40, 0 8px 25px ${pinColor}80; transform: scale(1.15);`
        : `box-shadow: 0 4px 14px rgba(0,0,0,0.25);`;

      const pinHtml = `
        <div class="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold font-mono border-2 border-white dark:border-slate-900 whitespace-nowrap shadow-lg transition-transform"
             style="background-color: ${pinColor}; ${activeGlow}">
          <span>${emoji}</span>
          <span>${price}</span>
        </div>
      `;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: 'eventrix-pin-icon',
        iconSize: [90, 32],
        iconAnchor: [45, 16],
      });

      const marker = L.marker([event.lat, event.lng], { icon: pinIcon }).addTo(markersLayer);

      marker.on('click', () => {
        onSelectEvent(event);
      });

      marker.on('mouseover', () => {
        setHoveredEvent(event);
      });

      marker.on('mouseout', () => {
        setHoveredEvent(null);
      });
    });
  }, [singles, clusters, selectedEvent, hoveredEvent, selectedCity, openCluster]);

  // Click outside dismiss for cluster popover
  useEffect(() => {
    if (!openCluster) return;
    const handleOutside = (e) => {
      if (clusterPopoverRef.current && !clusterPopoverRef.current.contains(e.target)) {
        setOpenCluster(null);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleOutside); };
  }, [openCluster]);

  // Zoom controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const config = CITY_MAP_CONFIG[selectedCity] || CITY_MAP_CONFIG['All Cities'];
    map.flyTo(config.center, config.zoom, { duration: 1.0 });
  };

  const handleZoomToCluster = (cluster) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([cluster.lat, cluster.lng], map.getZoom() + 2, { duration: 1.0 });
  };

  const handleViewAllInFeed = (clusterEvents) => {
    if (!clusterEvents.length) return;
    const first = cardRefs.current[clusterEvents[0].id];
    first?.scrollIntoView({
      behavior: reduceMotion ? 'instant' : 'smooth',
      block: 'center',
    });
    clusterEvents.forEach((ev, i) => {
      setTimeout(() => {
        setActiveRingId(ev.id);
        setTimeout(() => setActiveRingId(cur => cur === ev.id ? null : cur), 1200);
      }, i * 120);
    });
  };

  const isDark = mapTheme === 'dark';

  return (
    <div className={`flex flex-col lg:flex-row w-full transition-all duration-300 overflow-hidden rounded-3xl shadow-xl border ${
      isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200/80'
    } ${isExpanded ? 'h-[80vh] min-h-[580px]' : 'h-auto lg:h-[550px] xl:h-[570px]'}`}>

      {/* ═══════════════════════════════════════════════════════════════
          LEFT COLUMN — 48% Interactive Event Feed (Spacious & Modern)
      ════════════════════════════════════════════════════════════════ */}
      <div className={`event-feed-column w-full lg:w-[48%] xl:w-[46%] h-[440px] lg:h-full flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/50 border-slate-200/80'
      }`}>

        {/* Sticky Header */}
        <div className={`px-5 py-3.5 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200/80 bg-white/90'} backdrop-blur-md`}>
          <div className="flex items-start justify-between mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                  {translateCity(cityConfig.name)}
                </span>
              </div>
              <h2 className={`text-base sm:text-lg font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {mappedEvents.length} {t('map.eventsFound', 'Weekend Events Found')}
              </h2>
            </div>

            {/* Sort Menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
              >
                {sortBy === 'Relevance' ? t('map.relevance', 'Relevance') :
                 sortBy === 'Price: Low to High' ? t('map.priceLowHigh', 'Price (Low to High)') :
                 sortBy === 'Price: High to Low' ? t('map.priceHighLow', 'Price (High to Low)') :
                 sortBy === 'Date' ? t('map.dateSoonest', 'Date (Soonest)') :
                 sortBy === 'Rating' ? t('map.popular', 'Most Popular') : sortBy}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    className={`absolute right-0 top-10 w-48 rounded-2xl shadow-2xl border p-1 z-50 ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    {[
                      { key: 'Relevance', label: t('map.relevance', 'Relevance') },
                      { key: 'Price: Low to High', label: t('map.priceLowHigh', 'Price: Low to High') },
                      { key: 'Price: High to Low', label: t('map.priceHighLow', 'Price: High to Low') },
                      { key: 'Date', label: t('map.dateSoonest', 'Date (Soonest)') },
                      { key: 'Rating', label: t('map.popular', 'Most Popular') },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                          sortBy === opt.key
                            ? 'bg-[#075985] text-white font-bold'
                            : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Date Tabs */}
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-0.5">
            {[
              { id: 'tonight', label: t('map.tonightFri', 'Tonight (Fri)') },
              { id: 'saturday', label: t('map.saturdayAllDay', 'Saturday All-Day') },
              { id: 'sunday', label: t('map.sundayChill', 'Sunday Chill') },
            ].map((dayObj, i) => (
              <button
                key={dayObj.id}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  i === 0
                    ? 'bg-[#075985] text-white shadow-sm'
                    : isDark 
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200' 
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {dayObj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Feed List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 [&::-webkit-scrollbar]:hidden overscroll-contain">
          {mappedEvents.length === 0 && (
            <div className="text-center py-20">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('map.noEventsCity', 'No events found for')} {translateCity(selectedCity)}.
              </p>
              {onSelectCity && (
                <button
                  onClick={() => onSelectCity('All Cities')}
                  className="mt-3 px-4 py-1.5 rounded-full bg-[#075985] text-white text-xs font-bold cursor-pointer"
                >
                  {t('map.exploreAllCities', 'Explore All Indian Cities')}
                </button>
              )}
            </div>
          )}

          {mappedEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id;
            const isCardHovered = hoveredEvent?.id === event.id;
            const isRingActive = activeRingId === event.id;
            const pinColor = getPinColor(event);
            const price = parseFloat(event.ticket_price) === 0 ? t('card.free', 'FREE') : formatCurrency(event.ticket_price);
            const dateParts = getEventDateParts(event.start_date || event.start_time);

            return (
              <motion.div
                key={event.id}
                ref={el => { cardRefs.current[event.id] = el; }}
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => onSelectEvent(event)}
                whileHover={reduceMotion ? {} : { y: -2 }}
                transition={{ duration: 0.15 }}
                className={`group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden flex bg-white dark:bg-slate-900 ${
                  isSelected 
                    ? 'ring-2 ring-[#075985] border-[#075985] shadow-xl shadow-[#075985]/15' 
                    : isRingActive || isCardHovered
                      ? 'ring-1 ring-[#0284C7] border-[#0284C7] shadow-lg shadow-[#0284C7]/10'
                      : isDark 
                        ? 'border-slate-800/80 hover:border-slate-700 hover:shadow-lg' 
                        : 'border-slate-200/90 hover:border-[#BAE6FD] hover:shadow-lg hover:shadow-slate-200/50'
                }`}
              >
                {/* ── LEFT TICKET DATE STUB (Authentic Pass Cutout) ── */}
                <div className={`relative w-[68px] sm:w-[76px] shrink-0 flex flex-col items-center justify-between py-3 px-1 border-r-2 border-dashed border-slate-200 dark:border-slate-800 select-none ${
                  isSelected 
                    ? 'bg-gradient-to-b from-[#075985]/15 via-[#E0F2FE]/60 to-white dark:from-[#075985]/30 dark:via-slate-800 dark:to-slate-900' 
                    : 'bg-slate-50/90 dark:bg-slate-800/50 group-hover:bg-[#E0F2FE]/40 transition-colors'
                }`}>
                  {/* Top & Bottom Ticket Semicircular Cutout Notches */}
                  <div className="absolute -top-2.5 -right-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 z-10" />
                  <div className="absolute -bottom-2.5 -right-2 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 z-10" />

                  {/* Month */}
                  <span 
                    className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{ color: pinColor }}
                  >
                    {dateParts.month}
                  </span>

                  {/* Day Number */}
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#0F172A] dark:text-white leading-none my-1">
                    {dateParts.day}
                  </span>

                  {/* Weekday */}
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {dateParts.weekday}
                  </span>
                </div>

                {/* ── RIGHT MAIN CARD CONTENT ── */}
                <div className="flex-1 min-w-0 p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex gap-3 items-start">
                    {/* Media Thumbnail with hover zoom */}
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-800">
                      <img
                        src={event.banner_url || FALLBACK_IMG}
                        alt={event.title}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <span 
                        className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                        style={{ backgroundColor: pinColor }}
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span 
                          className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                          style={{ backgroundColor: pinColor }}
                        >
                          {event.category_details?.name || t('hero.featured', 'Event')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#075985]" />
                          {translateCity(event.city)}
                        </span>
                      </div>

                      <h3 className={`text-xs sm:text-sm font-extrabold leading-snug line-clamp-2 transition-colors ${
                        isSelected ? 'text-[#075985] dark:text-[#BAE6FD]' : isDark ? 'text-white group-hover:text-[#BAE6FD]' : 'text-slate-900 group-hover:text-[#075985]'
                      }`}>
                        {event.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                        {event.venue_name || `${translateCity(event.city)} Venue`}
                      </p>
                    </div>
                  </div>

                  {/* Price & Coral Ticket Action */}
                  <div className={`flex items-center justify-between pt-2 mt-2 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('map.tickets', 'TICKETS')}</span>
                      <span className={`text-sm sm:text-base font-black font-mono ${
                        isDark ? 'text-white' : 'text-[#0F172A]'
                      }`}>
                        {price}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectEvent) onSelectEvent(null);
                        onOpenDetails(event);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF4F70] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white text-xs font-bold transition-all shadow-md shadow-[#FF4F70]/25 hover:shadow-lg hover:shadow-[#FF4F70]/35 active:scale-95 cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{t('map.bookPass', 'Book Pass')}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT COLUMN — 52% Real Geographic Leaflet Map (Well-Proportioned)
      ════════════════════════════════════════════════════════════════ */}
      <div className="map-canvas-column w-full lg:w-[52%] xl:w-[54%] h-[340px] lg:h-full relative select-none overflow-hidden">
        
        {/* Leaflet Map DOM Node */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* ── Top Bar: Location Switcher & Quick Navigation ── */}
        <div className="absolute top-4 left-4 right-16 z-[400] pointer-events-auto flex items-center gap-2">
          
          {/* City Selector Pill with Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCityMenu(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black shadow-lg border transition-all ${
                isDark 
                  ? 'bg-[#075985]/90 hover:bg-[#075985] text-white border-[#075985]' 
                  : 'bg-[#075985] hover:bg-[#0369A1] text-white border-[#075985]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{translateCity(selectedCity)}</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            <AnimatePresence>
              {showCityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  className={`absolute left-0 top-11 w-56 max-h-72 overflow-y-auto rounded-2xl shadow-2xl border p-1.5 z-50 ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#BAE6FD]'
                  }`}
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('map.selectCity', 'Select Indian City')}
                  </div>
                  {SUPPORTED_CITIES.map(city => (
                    <button
                      key={city}
                      onClick={() => {
                        if (onSelectCity) onSelectCity(city);
                        setShowCityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedCity === city
                          ? 'bg-[#075985] text-white font-bold'
                          : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-[#E0F2FE]/60'
                      }`}
                    >
                      <span>{translateCity(city)}</span>
                      {selectedCity === city && <span className="text-[10px]">● {t('map.active', 'Active')}</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick City Navigation Carousel for All Cities */}
          {selectedCity === 'All Cities' && (
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden p-1 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-[#BAE6FD] dark:border-slate-800 shadow-lg">
              {SUPPORTED_CITIES.filter(c => c !== 'All Cities').map(city => {
                const count = mappedEvents.filter(ev => ev.city === city).length;
                return (
                  <button
                    key={city}
                    onClick={() => {
                      if (onSelectCity) onSelectCity(city);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-[#E0F2FE]/60'
                    }`}
                  >
                    <span>{translateCity(city)}</span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E0F2FE] text-[#075985] font-bold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Floating Controls HUD (Right Side) ── */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
          {/* Zoom In & Out */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-1 flex flex-col gap-0.5">
            <button 
              onClick={handleZoomIn} 
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-700 dark:text-slate-200 transition-colors" 
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-800 mx-1" />
            <button 
              onClick={handleZoomOut} 
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-700 dark:text-slate-200 transition-colors" 
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Reset / Center Compass */}
          <button 
            onClick={handleResetCenter} 
            className="w-11 h-11 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95" 
            title="Reset to City Center"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Light / Dark Mode) */}
          <button 
            onClick={() => setMapTheme(t => t === 'light' ? 'dark' : 'light')} 
            className={`w-11 h-11 backdrop-blur-xl rounded-2xl shadow-xl border flex items-center justify-center transition-all active:scale-95 ${
              isDark 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30' 
                : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-slate-50'
            }`}
            title={isDark ? 'Switch to Light Map' : 'Switch to Dark Map'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen / Height Expansion */}
          <button 
            onClick={() => setIsExpanded(e => !e)} 
            className="w-11 h-11 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-95" 
            title={isExpanded ? 'Collapse Map' : 'Expand Map View'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Cluster Popover ── */}
        <AnimatePresence>
          {openCluster && (
            <ClusterPopover
              cluster={openCluster}
              onClose={() => setOpenCluster(null)}
              onOpenDetails={onOpenDetails}
              onViewAllInFeed={handleViewAllInFeed}
              onZoomToSeparate={handleZoomToCluster}
              popoverRef={clusterPopoverRef}
              reduceMotion={reduceMotion}
              isDark={isDark}
            />
          )}
        </AnimatePresence>

        {/* ── Selected Event Preview Floating Card ── */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`absolute bottom-16 left-6 w-80 rounded-2xl shadow-2xl border overflow-hidden z-[30] ${
                isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              } backdrop-blur-xl`}
            >
              <div className="relative w-full aspect-video overflow-hidden">
                <img
                  src={selectedEvent.banner_url || FALLBACK_IMG}
                  alt={selectedEvent.title}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span 
                    className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold shadow"
                    style={{ backgroundColor: getPinColor(selectedEvent) }}
                  >
                    {selectedEvent.category_details?.name || t('hero.featured', 'Event')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold font-mono">
                    {parseFloat(selectedEvent.ticket_price) === 0 ? t('card.free', 'FREE') : formatCurrency(selectedEvent.ticket_price)}
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onSelectEvent(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-500">4.9</span>
                  <span className="text-[10px] text-slate-400">(210 reviews)</span>
                </div>

                <h3 className="text-xs font-extrabold leading-snug line-clamp-2 mb-2 font-['Plus_Jakarta_Sans']">
                  {selectedEvent.title}
                </h3>

                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#075985]" />
                  <span className="truncate">{selectedEvent.venue_name || `${translateCity(selectedEvent.city)} Venue`}</span>
                </div>

                <div className="flex items-center gap-1.5 mb-3 text-[11px] text-slate-400">
                  <span>🗓️</span>
                  <span>{formatDate(selectedEvent.start_time || selectedEvent.start_date)}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEvent) onSelectEvent(null);
                    onOpenDetails(selectedEvent);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF4F70] hover:bg-[#E11D48] text-white text-xs font-bold transition-all shadow-md shadow-[#FF4F70]/25 active:scale-95 cursor-pointer"
                >
                  <span>{t('map.getTickets', 'Get Tickets')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom HUD Legend & Stats ── */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-[400]">
          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/70 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between pointer-events-auto">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className={`text-xs font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {mappedEvents.length} {t('map.eventsPinned', 'Events in')} {translateCity(cityConfig.name)}
              </span>
              <span className="text-[10px] text-slate-400">· {translateCity(cityConfig.name)}</span>
            </div>

            {/* Category dot legend */}
            <div className="hidden md:flex items-center gap-3">
              {[
                { color: '#6366f1', label: t('map.legendMusic', 'Music & Concerts') },
                { color: '#f59e0b', label: t('map.legendFood', 'Food & Night Market') },
                { color: '#f43f5e', label: t('map.legendComedy', 'Comedy & Theatre') },
                { color: '#10b981', label: t('map.legendWellness', 'Wellness & Yoga') },
                { color: '#ec4899', label: t('map.legendArts', 'Arts & Exhibitions') },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Map Theme & Mode indicator */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="uppercase">{mapTheme} MODE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
