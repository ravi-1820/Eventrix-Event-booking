import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, ImageIcon, AlertCircle, Calendar, MapPin, 
  Ticket, CheckCircle2, ShieldCheck, DollarSign, Upload, RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

const PRESET_BANNERS = [
  {
    label: 'Tech & AI Summit',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Music & Arts',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Business & Leadership',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Creative & Design',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
  },
];

const INITIAL_FORM = {
  title: '',
  short_description: '',
  description: '',
  event_type: 'IN_PERSON',
  category: '',
  venue_name: '',
  city: '',
  location_or_link: '',
  start_time: '',
  end_time: '',
  ticket_price: '499',
  is_free: false,
  capacity: '150',
  banner_url: PRESET_BANNERS[0].url,
  status: 'PUBLISHED',
  is_featured: false,
};

function FormSection({ number, title, subtitle, children }) {
  return (
    <div className="bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
        <span className="w-6 h-6 rounded-lg bg-[#075985] text-white text-xs font-black flex items-center justify-center shrink-0">
          {number}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 pt-1">{children}</div>
    </div>
  );
}

function FormField({ label, error, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#075985] focus:ring-1 focus:ring-[#075985] transition-all";
const selectCls = `${inputCls} cursor-pointer`;

export function CreateEventModal({ isOpen, onClose, onSuccess, categories = [] }) {
  const { t, translateCategory } = useLanguage();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      tomorrow.setHours(10, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(18, 0, 0, 0);

      const pad = (n) => String(n).padStart(2, '0');
      const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      setForm({
        ...INITIAL_FORM,
        category: categories[0]?.id ? String(categories[0].id) : '',
        start_time: toLocalISO(tomorrow),
        end_time: toLocalISO(end),
      });
      setErrors({});
      setGlobalError('');
    }
  }, [isOpen, categories]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const set = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'is_free') {
        if (value) next.ticket_price = '0';
        else if (prev.ticket_price === '0') next.ticket_price = '499';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('admin.events.titleRequired', 'Event title is required');
    if (!form.description.trim()) e.description = t('admin.events.descRequired', 'Full description is required');
    if (!form.start_time) e.start_time = t('admin.events.startTimeRequired', 'Start time is required');
    if (!form.end_time) e.end_time = t('admin.events.endTimeRequired', 'End time is required');
    if (form.start_time && form.end_time && form.end_time <= form.start_time)
      e.end_time = t('admin.events.endTimeAfterStart', 'End time must be after start time');
    if (!form.venue_name.trim()) e.venue_name = t('admin.events.venueRequired', 'Venue name is required');
    if (!form.city.trim()) e.city = t('admin.events.cityRequired', 'City is required');
    if (!form.is_free && parseFloat(form.ticket_price) < 0) e.ticket_price = t('admin.events.priceNegative', 'Price cannot be negative');
    if (parseInt(form.capacity, 10) < 1) e.capacity = t('admin.events.capacityMin', 'Capacity must be at least 1');
    return e;
  };

  const handleSubmit = async (submitStatus = 'PUBLISHED') => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setGlobalError('');
    try {
      const toISO = (dt) => dt ? (dt.length === 16 ? dt + ':00' : dt) : dt;

      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim() || form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        venue_name: form.venue_name.trim(),
        city: form.city.trim(),
        location_or_link: form.location_or_link.trim() || `${form.venue_name.trim()}, ${form.city.trim()}`,
        banner_url: form.banner_url.trim() || PRESET_BANNERS[0].url,
        status: submitStatus,
        is_featured: form.is_featured,
        ticket_price: form.is_free ? 0 : parseFloat(form.ticket_price) || 0,
        capacity: parseInt(form.capacity, 10) || 150,
        category: form.category ? parseInt(form.category, 10) : null,
        start_time: toISO(form.start_time),
        end_time: toISO(form.end_time),
      };

      const created = await api.createEvent(payload);
      onSuccess(created);
      onClose();
    } catch (err) {
      console.error(err);
      let errMsg = t('admin.events.failedCreate', 'Failed to create event.');
      try {
        const parsed = JSON.parse(err.message);
        const msgs = Object.values(parsed).flat();
        if (msgs.length) errMsg = msgs.join(', ');
      } catch {
        if (err.message) errMsg = err.message;
      }
      setGlobalError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl transform rounded-3xl bg-white text-left shadow-2xl transition-all border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Header */}
              <div className="px-6 py-4.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#075985] text-white flex items-center justify-center shadow-sm">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {t('admin.events.createNewEvent', 'Create New Event')}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {t('admin.events.fillOutInfo', 'Fill out all structured event information for attendees & ticketing.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto p-6 space-y-6 flex-1">
                {globalError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{globalError}</span>
                  </div>
                )}

                {/* SECTION 1: Basic Information */}
                <FormSection number="1" title={t('admin.events.secBasicInfo', 'Basic Information')} subtitle={t('admin.events.secBasicSub', 'Name, category and narrative of your event')}>
                  <FormField label={t('admin.events.lblTitle', 'Event Title')} error={errors.title} required>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={t('admin.events.phTitle', 'e.g., Global AI & Cloud Summit 2026')}
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('admin.events.lblTagline', 'Short Tagline')}>
                      <input
                        type="text"
                        className={inputCls}
                        placeholder={t('admin.events.phTagline', 'Catchy one-liner for search & social previews')}
                        value={form.short_description}
                        onChange={(e) => set('short_description', e.target.value)}
                      />
                    </FormField>

                    <FormField label={t('admin.events.lblCategory', 'Category')}>
                      <select
                        className={selectCls}
                        value={form.category}
                        onChange={(e) => set('category', e.target.value)}
                      >
                        <option value="">{t('admin.events.phSelectCategory', '— Select Category —')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {translateCategory(c.name)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label={t('admin.events.lblDescription', 'Full Description')} error={errors.description} required>
                    <textarea
                      rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder={t('admin.events.phDescription', 'Describe what attendees will learn, speakers, schedule, and perks...')}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                    />
                  </FormField>
                </FormSection>

                {/* SECTION 2: Location */}
                <FormSection number="2" title={t('admin.events.secLocation', 'Location & Access')} subtitle={t('admin.events.secLocationSub', 'Physical address or virtual stream URL')}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label={t('admin.events.lblEventType', 'Event Type')}>
                      <select
                        className={selectCls}
                        value={form.event_type}
                        onChange={(e) => set('event_type', e.target.value)}
                      >
                        <option value="IN_PERSON">{t('admin.events.inPerson', 'In-Person')}</option>
                        <option value="VIRTUAL">{t('admin.events.virtual', 'Virtual / Online')}</option>
                        <option value="HYBRID">{t('admin.events.hybrid', 'Hybrid')}</option>
                      </select>
                    </FormField>

                    <FormField label={t('admin.events.lblVenue', 'Venue Name')} error={errors.venue_name} required>
                      <input
                        type="text"
                        className={inputCls}
                        placeholder={t('admin.events.phVenue', 'e.g., Grand Hyatt Convention Center')}
                        value={form.venue_name}
                        onChange={(e) => set('venue_name', e.target.value)}
                      />
                    </FormField>

                    <FormField label={t('admin.events.lblCity', 'City')} error={errors.city} required>
                      <input
                        type="text"
                        className={inputCls}
                        placeholder={t('admin.events.phCity', 'e.g., Ahmedabad, Mumbai')}
                        value={form.city}
                        onChange={(e) => set('city', e.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label={t('admin.events.lblAddress', 'Full Address / Map / Stream Link')}>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={t('admin.events.phAddress', 'Street address, Google Maps link, or Zoom webinar link')}
                      value={form.location_or_link}
                      onChange={(e) => set('location_or_link', e.target.value)}
                    />
                  </FormField>
                </FormSection>

                {/* SECTION 3: Schedule */}
                <FormSection number="3" title={t('admin.events.secSchedule', 'Schedule & Timing')} subtitle={t('admin.events.secScheduleSub', 'Start and conclusion dates in local time')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('admin.events.lblStartTime', 'Start Date & Time')} error={errors.start_time} required>
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={form.start_time}
                        onChange={(e) => set('start_time', e.target.value)}
                      />
                    </FormField>

                    <FormField label={t('admin.events.lblEndTime', 'End Date & Time')} error={errors.end_time} required>
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={form.end_time}
                        onChange={(e) => set('end_time', e.target.value)}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION 4: Ticketing */}
                <FormSection number="4" title={t('admin.events.secTicketing', 'Ticketing & Capacity')} subtitle={t('admin.events.secTicketingSub', 'Set pass pricing in INR (₹) and attendee cap')}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label={t('admin.events.lblTicketModel', 'Ticket Model')}>
                      <div className="flex items-center gap-2 pt-2">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.is_free}
                            onChange={(e) => set('is_free', e.target.checked)}
                            className="w-4 h-4 rounded text-[#075985] focus:ring-[#075985] border-slate-300"
                          />
                          <span>{t('admin.events.freeRsvpCommunity', 'Free RSVP / Community Event')}</span>
                        </label>
                      </div>
                    </FormField>

                    <FormField label={t('admin.events.lblTicketPrice', 'Ticket Price (₹ INR)')} error={errors.ticket_price} required={!form.is_free}>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          disabled={form.is_free}
                          min="0"
                          step="1"
                          className={`${inputCls} pl-8 disabled:bg-slate-100 disabled:text-slate-400`}
                          placeholder="e.g. 499"
                          value={form.ticket_price}
                          onChange={(e) => set('ticket_price', e.target.value)}
                        />
                      </div>
                    </FormField>

                    <FormField label={t('admin.events.lblTotalCapacity', 'Total Capacity')} error={errors.capacity} required>
                      <input
                        type="number"
                        min="1"
                        className={inputCls}
                        placeholder="e.g. 200"
                        value={form.capacity}
                        onChange={(e) => set('capacity', e.target.value)}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION 5: Media */}
                <FormSection number="5" title={t('admin.events.secMedia', 'Media & Visual Banner')} subtitle={t('admin.events.secMediaSub', 'Cover artwork displayed across cards and ticketing')}>
                  <div className="space-y-3">
                    <FormField label={t('admin.events.lblCoverImageUrl', 'Cover Image URL')}>
                      <input
                        type="url"
                        className={inputCls}
                        placeholder="https://images.unsplash.com/..."
                        value={form.banner_url}
                        onChange={(e) => set('banner_url', e.target.value)}
                      />
                    </FormField>

                    {/* Banner Presets */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        {t('admin.events.pickPresetBanner', 'Or Pick Curated High-Res Banner')}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_BANNERS.map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={() => set('banner_url', b.url)}
                            className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                              form.banner_url === b.url
                                ? 'border-[#075985] ring-2 ring-[#075985]/20 bg-[#E0F2FE]/50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <img
                              src={b.url}
                              alt={b.label}
                              className="w-full h-14 object-cover rounded-lg"
                            />
                            <span className="text-[10px] font-semibold text-slate-700 block mt-1 truncate">
                              {b.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview box */}
                    {form.banner_url && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-32 bg-slate-100">
                        <img
                          src={form.banner_url}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = PRESET_BANNERS[0].url;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-3">
                          <span className="text-white text-xs font-bold drop-shadow-sm">
                            {t('admin.events.liveBannerPreview', 'Live Banner Preview')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </FormSection>

                {/* SECTION 6: Publishing */}
                <FormSection number="6" title={t('admin.events.secPublishing', 'Publishing Status')} subtitle={t('admin.events.secPublishingSub', 'Choose initial visibility and promotion')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('admin.events.lblInitialStatus', 'Initial Status')}>
                      <select
                        className={selectCls}
                        value={form.status}
                        onChange={(e) => set('status', e.target.value)}
                      >
                        <option value="PUBLISHED">{t('admin.events.statusPublishedLive', 'Published (Live for bookings)')}</option>
                        <option value="DRAFT">{t('admin.events.statusDraftHidden', 'Draft (Hidden from public)')}</option>
                        <option value="CANCELLED">{t('admin.common.cancelled', 'Cancelled')}</option>
                      </select>
                    </FormField>

                    <FormField label={t('admin.events.lblPromotion', 'Platform Promotion')}>
                      <div className="pt-2">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.is_featured}
                            onChange={(e) => set('is_featured', e.target.checked)}
                            className="w-4 h-4 rounded text-[#075985] focus:ring-[#075985] border-slate-300"
                          />
                          <span>{t('admin.events.pinToFeatured', 'Pin to Featured Events Carousel')}</span>
                        </label>
                      </div>
                    </FormField>
                  </div>
                </FormSection>
              </div>

              {/* Sticky Action Bar */}
              <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  {t('admin.common.cancel', 'Cancel')}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('DRAFT')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {t('admin.events.saveDraft', 'Save Draft')}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('PUBLISHED')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] shadow-md shadow-[#075985]/20 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{t('admin.events.publishing', 'Publishing...')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>{t('admin.events.publishEvent', 'Publish Event')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
