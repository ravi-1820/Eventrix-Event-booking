import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Plus, Calendar, MapPin, Users, 
  Pencil, Trash2, Copy, Eye, DollarSign, LayoutGrid, 
  List, ChevronLeft, ChevronRight, AlertTriangle, Sparkles,
  ExternalLink, ArrowUpDown
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { api } from '../../../api/client';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminEventsView({
  events = [],
  categories = [],
  onCreateEvent,
  onEditEvent,
  onSelectEvent,
  onStatusChange,
  onDeleteEvent,
  showToast,
  onRefresh
}) {
  const { t, translateEvent, translateCity, translateCategory } = useLanguage();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState('ALL'); // 'ALL' | 'FREE' | 'PAID'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('date-asc'); // 'date-asc' | 'date-desc' | 'title' | 'revenue'
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Extract unique cities from events
  const uniqueCities = useMemo(() => {
    const set = new Set();
    events.forEach(e => { if (e.city) set.add(e.city); });
    return Array.from(set);
  }, [events]);

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.venue_name && e.venue_name.toLowerCase().includes(q))
      );

      const matchCity = cityFilter === 'ALL' || e.city === cityFilter;
      const matchCategory = categoryFilter === 'ALL' || String(e.category) === categoryFilter || (e.category_details && String(e.category_details.id) === categoryFilter);
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const isFree = parseFloat(e.ticket_price) === 0;
      const matchPrice = priceFilter === 'ALL' || (priceFilter === 'FREE' ? isFree : !isFree);

      return matchSearch && matchCity && matchCategory && matchStatus && matchPrice;
    }).sort((a, b) => {
      if (sortBy === 'date-asc') return new Date(a.start_time) - new Date(b.start_time);
      if (sortBy === 'date-desc') return new Date(b.start_time) - new Date(a.start_time);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'revenue') {
        const revA = (a.booked_count || 0) * parseFloat(a.ticket_price || 0);
        const revB = (b.booked_count || 0) * parseFloat(b.ticket_price || 0);
        return revB - revA;
      }
      return 0;
    });
  }, [events, search, cityFilter, categoryFilter, statusFilter, priceFilter, sortBy]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (slug) => {
    setActionLoading(true);
    try {
      await onDeleteEvent(slug);
      setDeleteConfirmSlug(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (event) => {
    try {
      const toISO = (dt) => dt ? (dt.length === 16 ? dt + ':00' : dt) : dt;
      const payload = {
        title: `${event.title} (Copy)`,
        short_description: event.short_description || '',
        description: event.description || '',
        venue_name: event.venue_name || 'Main Hall',
        city: event.city || 'Ahmedabad',
        location_or_link: event.location_or_link || '',
        ticket_price: parseFloat(event.ticket_price) || 0,
        capacity: parseInt(event.capacity, 10) || 150,
        category: event.category ? parseInt(event.category, 10) : (event.category_details?.id || null),
        start_time: toISO(event.start_time),
        end_time: toISO(event.end_time),
        banner_url: event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
        status: 'DRAFT',
      };
      await api.createEvent(payload);
      if (showToast) showToast(`Duplicated "${event.title}" as Draft!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to duplicate event');
    }
  };

  return (
    <div className="space-y-5 font-sans animate-in fade-in duration-200">
      
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
            {t('admin.eventsTitle', 'Events Management')}
          </h1>
          <p className="text-xs text-slate-500">
            {t('admin.eventsDesc', 'Manage, create, monitor, and duplicate all your hosted events')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table row view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Create CTA */}
          <button
            type="button"
            onClick={onCreateEvent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('admin.createEvent', 'Create Event')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('filter.searchEvents', 'Search events...')}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#075985] transition-colors"
            />
          </div>

          {/* Quick Select Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('admin.allStatus', 'All Status')}</option>
              <option value="PUBLISHED">{t('admin.statusPublished', 'PUBLISHED')}</option>
              <option value="DRAFT">{t('admin.statusDraft', 'DRAFT')}</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">{t('admin.statusCompleted', 'COMPLETED')}</option>
              <option value="CANCELLED">{t('admin.statusCancelled', 'CANCELLED')}</option>
            </select>

            {/* City */}
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('admin.allCities', 'All Cities')}</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{translateCity(c)}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('admin.allCategories', 'All Categories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>{translateCategory(cat.name)}</option>
              ))}
            </select>

            {/* Price Filter */}
            <select
              value={priceFilter}
              onChange={(e) => { setPriceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('admin.allPrices', 'All Pricing')}</option>
              <option value="FREE">{t('admin.freeOnly', 'Free RSVP')}</option>
              <option value="PAID">{t('admin.paidOnly', 'Paid Ticket')}</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="date-asc">{t('admin.sortDateAsc', 'Date: Upcoming first')}</option>
              <option value="date-desc">{t('admin.sortDateDesc', 'Date: Latest first')}</option>
              <option value="title">{t('admin.sortTitle', 'Title: A-Z')}</option>
              <option value="revenue">{t('admin.sortRevenue', 'Highest Revenue')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Events Listing */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-3">
          <Calendar size={36} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-900">{t('admin.noEventsFound', 'No events found')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t('admin.noEventsMatch', 'No events match your selected filters')}
          </p>
          <button
            type="button"
            onClick={onCreateEvent}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>{t('admin.createEvent', 'Create Event')}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginatedEvents.map((rawEvent) => {
            const event = translateEvent(rawEvent);
            const isFree = parseFloat(event.ticket_price) === 0;
            return (
              <div
                key={event.id || event.slug}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Banner */}
                  <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <select
                        value={event.status}
                        onChange={(e) => onStatusChange(event.slug, e.target.value)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 backdrop-blur-md border-0 shadow-sm cursor-pointer focus:outline-none"
                      >
                        <option value="DRAFT">{t('admin.statusDraft', 'Draft')}</option>
                        <option value="PUBLISHED">{t('admin.statusPublished', 'Published')}</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETED">{t('admin.statusCompleted', 'Completed')}</option>
                        <option value="CANCELLED">{t('admin.statusCancelled', 'Cancelled')}</option>
                      </select>
                    </div>

                    {/* Price Tag */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white font-mono text-[11px] font-bold backdrop-blur-md">
                        {isFree ? t('admin.free', 'FREE') : formatCurrency(event.ticket_price)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="absolute bottom-2.5 left-3 text-white text-[11px] font-semibold drop-shadow flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-indigo-600 truncate">
                        {translateCategory(event.category_details?.name || 'Experience')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {translateCity(event.city)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {event.short_description || event.description}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">{t('admin.capacityFill', 'Occupancy')}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {event.booked_count || 0} / {event.capacity}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectEvent(rawEvent)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={t('admin.eventDetails', 'View Details')}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditEvent(rawEvent)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={t('admin.edit', 'Edit Event')}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(rawEvent)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={t('admin.duplicate', 'Duplicate Event')}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmSlug(rawEvent.slug)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={t('admin.delete', 'Delete Event')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Inline Delete Confirmation */}
                {deleteConfirmSlug === rawEvent.slug && (
                  <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 flex items-center justify-between animate-in fade-in duration-150">
                    <span className="font-semibold">{t('admin.delete', 'Delete?')}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(rawEvent.slug)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
                      >
                        {t('admin.delete', 'Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmSlug(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                      >
                        {t('admin.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (

        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">{t('admin.colEvent', 'Event')}</th>
                  <th className="py-3 px-4">{t('filter.allCategories', 'Category')}</th>
                  <th className="py-3 px-4">{t('admin.allCities', 'City')}</th>
                  <th className="py-3 px-4">{t('admin.colDate', 'Date')}</th>
                  <th className="py-3 px-4">{t('admin.ticketsSold', 'Tickets Sold')}</th>
                  <th className="py-3 px-4">{t('admin.colAmount', 'Price')}</th>
                  <th className="py-3 px-4">{t('admin.colStatus', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('admin.colAction', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEvents.map((rawEvent) => {
                  const event = translateEvent(rawEvent);
                  return (
                    <tr key={event.id || event.slug} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'}
                            alt={event.title}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]" title={event.title}>
                              {event.title}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {event.venue_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-600">
                        {translateCategory(event.category_details?.name || 'General')}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {translateCity(event.city)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDate(event.start_time)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {event.booked_count || 0} / {event.capacity}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {parseFloat(event.ticket_price) === 0 ? t('admin.free', 'FREE') : formatCurrency(event.ticket_price)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          event.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectEvent(rawEvent)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={t('admin.eventDetails', 'View Details')}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditEvent(rawEvent)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={t('admin.edit', 'Edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(rawEvent)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={t('admin.duplicate', 'Duplicate')}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSlug(rawEvent.slug)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={t('admin.delete', 'Delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-sm text-xs">
          <span className="text-slate-500 font-medium">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredEvents.length)} {t('admin.of', 'of')} {filteredEvents.length} {t('admin.events', 'events')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-bold text-slate-800">
              {t('admin.page', 'Page')} {page} {t('admin.of', 'of')} {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
